import { randomUUID } from 'node:crypto'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { FastifyInstance, LightMyRequestResponse } from 'fastify'
import { buildApp } from '../../src/app.js'
import { createAuth } from '../../src/auth/better-auth.js'
import { config } from '../../src/config/env.js'
import { createPools, type Pools } from '../../src/db/pools.js'

export interface TestServer {
  app: FastifyInstance
  pools: Pools
}

export interface TestServerOptions {
  allowedEmails?: string[]
}

export interface TrpcEnvelope<T> {
  result?: { data: T }
  error?: { message: string; code: number; data: { code: string; httpStatus: number } }
}

export function newEmail(): string {
  return `test-${randomUUID()}@example.com`
}

export async function createTestServer(
  options: TestServerOptions = {},
): Promise<TestServer> {
  const pools = createPools(config)
  const allowedEmails = options.allowedEmails
    ? new Set(options.allowedEmails.map((email) => email.toLowerCase()))
    : config.allowedEmails
  const testConfig = {
    ...config,
    allowedEmails,
    registrationOpen:
      config.nodeEnv !== 'production' && allowedEmails.size === 0,
  }
  const auth = createAuth(drizzle({ client: pools.auth }), testConfig)
  const app = buildApp({ auth, pools, config: testConfig })
  await app.ready()
  return { app, pools }
}

export async function closeTestServer(server: TestServer): Promise<void> {
  await server.app.close()
  await server.pools.close()
}

export async function deleteUser(pools: Pools, email: string): Promise<void> {
  await pools.auth`DELETE FROM auth."user" WHERE lower(email) = ${email}`
}

export function getProcedure(
  app: FastifyInstance,
  procedure: string,
  headers: Record<string, string> = {},
): Promise<LightMyRequestResponse> {
  return app.inject({ method: 'GET', url: `/trpc/${procedure}`, headers })
}

export function postProcedure(
  app: FastifyInstance,
  procedure: string,
  input: unknown,
  headers: Record<string, string> = {},
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: 'POST',
    url: `/trpc/${procedure}`,
    headers,
    payload: input as Record<string, unknown>,
  })
}

export function envelope<T>(res: LightMyRequestResponse): TrpcEnvelope<T> {
  return JSON.parse(res.body) as TrpcEnvelope<T>
}

export function cookieHeader(res: LightMyRequestResponse): string {
  const raw = res.headers['set-cookie']
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  return list.map((cookie) => cookie.split(';')[0]).join('; ')
}
