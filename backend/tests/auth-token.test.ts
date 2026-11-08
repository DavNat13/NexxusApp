import { decodeProtectedHeader } from 'jose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTokenService } from '../src/auth/access-token.js'
import { config } from '../src/config/env.js'
import {
  closeTestServer,
  cookieHeader,
  createTestServer,
  deleteUser,
  envelope,
  getProcedure,
  newEmail,
  postProcedure,
  type TestServer,
} from './helpers/server.js'

interface AuthResult {
  user: { id: string; email: string; name: string }
  accessToken: string
  expiresAt: number
  tokenType: string
}

const email = newEmail()
const password = 'clave-segura-123'
let server: TestServer
let cookie = ''
let accessToken = ''
let userId = ''

beforeAll(async () => {
  server = await createTestServer()

  const res = await postProcedure(server.app, 'auth.register', {
    name: 'Ana',
    email,
    password,
  })

  const body = envelope<AuthResult>(res)
  cookie = cookieHeader(res)
  accessToken = body.result?.data.accessToken ?? ''
  userId = body.result?.data.user.id ?? ''
})

afterAll(async () => {
  await deleteUser(server.pools, email)
  await closeTestServer(server)
})

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` }
}

describe('access token en las peticiones', () => {
  it('el registro devuelve un JWT EdDSA con kid', () => {
    const header = decodeProtectedHeader(accessToken)
    expect(header.alg).toBe('EdDSA')
    expect(header.kid).toBe(config.jwtKid)
    expect(userId).toBeTruthy()
  })

  it('me acepta el token sin cookie', async () => {
    const res = await getProcedure(server.app, 'auth.me', bearer(accessToken))
    const body = envelope<{ user: { email: string } }>(res)

    expect(body.result?.data.user.email).toBe(email)
  })

  it('rechaza un token manipulado', async () => {
    const [header, payload, signature] = accessToken.split('.')
    const first = signature?.at(0) === 'A' ? 'B' : 'A'
    const tampered = `${header}.${payload}.${first}${signature?.slice(1)}`
    const res = await getProcedure(server.app, 'auth.me', bearer(tampered))

    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
  })

  it('rechaza alg none', async () => {
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT', kid: config.jwtKid }),
    ).toString('base64url')
    const payload = Buffer.from(
      JSON.stringify({ sub: userId, sid: 'x', iss: config.jwtIssuer, aud: config.jwtAudience }),
    ).toString('base64url')

    const res = await getProcedure(server.app, 'auth.me', bearer(`${header}.${payload}.`))
    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
  })

  it('rechaza un token expirado', async () => {
    const expired = createTokenService({ ...config, accessTokenTtlSeconds: -60 })
    const token = await expired.sign(userId, 'session-x')

    const res = await getProcedure(server.app, 'auth.me', bearer(token.token))
    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
  })

  it('refresh emite un token nuevo y válido', async () => {
    const res = await postProcedure(server.app, 'auth.refresh', {}, { cookie })
    const body = envelope<AuthResult>(res)
    const renewed = body.result?.data.accessToken ?? ''

    expect(renewed).toBeTruthy()
    expect(renewed).not.toBe(accessToken)

    const me = await getProcedure(server.app, 'auth.me', bearer(renewed))
    expect(envelope<{ user: { email: string } }>(me).result?.data.user.email).toBe(email)
  })

  it('tras logout, refresh con la cookie vieja falla', async () => {
    const out = await postProcedure(server.app, 'auth.logout', {}, { cookie })
    expect(envelope<{ ok: boolean }>(out).result?.data.ok).toBe(true)

    const res = await postProcedure(server.app, 'auth.refresh', {}, { cookie })
    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
  })
})
