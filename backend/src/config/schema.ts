import { BASE_ENV_KEYS, baseEnvSchema, validateBaseEnv } from './base-schema.js'
import {
  MAIL_ENV_KEYS,
  mailFields,
  parseMailSettings,
  validateMail,
  type MailSettings,
} from './mail-schema.js'
import {
  REGISTRATION_ENV_KEYS,
  parseAllowedEmails,
  registrationFields,
  validateRegistration,
} from './registration-schema.js'

const envSchema = baseEnvSchema
  .extend(registrationFields)
  .extend(mailFields)
  .superRefine((value, ctx) => {
    validateBaseEnv(value, ctx)
    validateRegistration(value.ALLOWED_EMAILS, value.NODE_ENV, ctx)
    validateMail(value, value.NODE_ENV, ctx)
  })

export const ENV_KEYS = [
  ...BASE_ENV_KEYS,
  ...REGISTRATION_ENV_KEYS,
  ...MAIL_ENV_KEYS,
] as const

export interface Config {
  nodeEnv: 'development' | 'test' | 'production'
  host: string
  port: number
  databaseUrlAuth: string
  databaseUrlApp: string
  betterAuthSecret: string
  betterAuthUrl: string
  trustedOrigins: string[]
  sessionTtlSeconds: number
  sessionUpdateAgeSeconds: number
  sessionAbsoluteMaxSeconds: number
  trustProxyHops: number
  accessTokenTtlSeconds: number
  jwtIssuer: string
  jwtAudience: string
  jwtKid: string
  jwtPrivateKeyB64: string
  jwtPublicKeyB64: string
  allowedEmails: Set<string>
  /** Sin lista en desarrollo/test el registro queda abierto. */
  registrationOpen: boolean
  /** `null` en desarrollo/test sin SMTP: el flujo responde igual, sin enviar. */
  mail: MailSettings | null
}

const FORBIDDEN_KEYS = ['DATABASE_URL_MIGRATOR', 'POSTGRES_SUPERUSER_PASSWORD']

export function parseConfig(source: NodeJS.ProcessEnv): Config {
  for (const key of FORBIDDEN_KEYS) {
    if (source[key]) {
      throw new Error(`La API no debe conocer ${key}`)
    }
  }

  const result = envSchema.safeParse(source)

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Configuración inválida:\n${detail}`)
  }

  const env = result.data
  const allowedEmails = parseAllowedEmails(env.ALLOWED_EMAILS)

  return {
    nodeEnv: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    databaseUrlAuth: env.DATABASE_URL_AUTH,
    databaseUrlApp: env.DATABASE_URL_APP,
    betterAuthSecret: env.BETTER_AUTH_SECRET,
    betterAuthUrl: env.BETTER_AUTH_URL,
    trustedOrigins: env.TRUSTED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    sessionTtlSeconds: env.SESSION_TTL_SECONDS,
    sessionUpdateAgeSeconds: env.SESSION_UPDATE_AGE_SECONDS,
    sessionAbsoluteMaxSeconds: env.SESSION_ABSOLUTE_MAX_SECONDS,
    trustProxyHops: env.TRUST_PROXY_HOPS,
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    jwtIssuer: env.JWT_ISSUER,
    jwtAudience: env.JWT_AUDIENCE,
    jwtKid: env.JWT_KID,
    jwtPrivateKeyB64: env.JWT_PRIVATE_KEY_B64,
    jwtPublicKeyB64: env.JWT_PUBLIC_KEY_B64,
    allowedEmails,
    registrationOpen: env.NODE_ENV !== 'production' && allowedEmails.size === 0,
    mail: parseMailSettings(env),
  }
}
