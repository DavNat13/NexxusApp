import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { account, session, user, verification } from '@nexxus/database/schema/auth'
import type { Config } from '../config/schema.js'

export type AuthDb = PostgresJsDatabase

/**
 * Factoría de Better Auth para la API.
 * El CLI del esquema usa su propia instancia con el rol migrator;
 * esta solo se construye con el pool de auth_service.
 */
export function createAuth(db: AuthDb, config: Config) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    basePath: '/api/auth',
    trustedOrigins: config.trustedOrigins,
    telemetry: { enabled: false },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: config.sessionTtlSeconds,
      updateAge: config.sessionUpdateAgeSeconds,
      cookieCache: { enabled: false },
    },
    rateLimit: { enabled: false },
  })
}

export type Auth = ReturnType<typeof createAuth>
