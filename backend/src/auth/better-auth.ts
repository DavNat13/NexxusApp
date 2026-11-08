import { betterAuth } from 'better-auth'
import { bearer, emailOTP } from 'better-auth/plugins'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { FastifyBaseLogger } from 'fastify'
import { account, session, user, verification } from '@nexxus/database/schema/auth'
import type { Config } from '../config/schema.js'
import type { Mailer } from '../mail/mailer.js'
import { passwordChangedNotice, passwordResetCode } from '../mail/templates.js'

export type AuthDb = PostgresJsDatabase

export interface AuthDeps {
  mailer: Mailer | null
  log: Pick<FastifyBaseLogger, 'warn'>
}

function queue(log: AuthDeps['log'], mailer: Mailer | null, message: Parameters<Mailer['send']>[0]): void {
  if (!mailer) {
    log.warn('SMTP sin configurar: el correo no se enviará')
    return
  }

  try {
    mailer.send(message)
  } catch {
    log.warn('no se pudo encolar el correo')
  }
}

/**
 * Factoría de Better Auth para la API.
 * El CLI del esquema usa su propia instancia con el rol migrator;
 * esta solo se construye con el pool de auth_service.
 */
export function createAuth(db: AuthDb, config: Config, deps: AuthDeps) {
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
      revokeSessionsOnPasswordReset: true,
      async onPasswordReset({ user: changed }) {
        queue(deps.log, deps.mailer, {
          to: changed.email,
          ...passwordChangedNotice(),
        })
      },
    },
    session: {
      expiresIn: config.sessionTtlSeconds,
      updateAge: config.sessionUpdateAgeSeconds,
      cookieCache: { enabled: false },
    },
    rateLimit: { enabled: false },
    plugins: [
      // El refresh nativo es el valor firmado de `set-auth-token`. Un token
      // opaco crudo o un JWT de acceso no pueden hacerse pasar por sesión.
      bearer({ requireSignature: true }),
      emailOTP({
        otpLength: 6,
        expiresIn: 900,
        allowedAttempts: 3,
        storeOTP: 'hashed',
        disableSignUp: true,
        resendStrategy: 'rotate',
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== 'forget-password') return

          queue(deps.log, deps.mailer, {
            to: email,
            ...passwordResetCode(otp),
          })
        },
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
