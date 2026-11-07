import { z } from 'zod'
import { parseKeyPair } from './keys.js'

/** Variables base de la API. Registro y correo se añaden en sus módulos. */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL_AUTH: z.url(),
  DATABASE_URL_APP: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  TRUSTED_ORIGINS: z.string().default(''),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(1_209_600),
  SESSION_UPDATE_AGE_SECONDS: z.coerce.number().int().positive().default(86_400),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(900),
  JWT_ISSUER: z.string().min(1).default('nexxus'),
  JWT_AUDIENCE: z.string().min(1).default('nexxus-app'),
  JWT_KID: z.string().min(1).max(32).default('v1'),
  JWT_PRIVATE_KEY_B64: z.string().min(1),
  JWT_PUBLIC_KEY_B64: z.string().min(1),
})

export type BaseEnv = z.infer<typeof baseEnvSchema>

export function validateBaseEnv(value: BaseEnv, ctx: z.RefinementCtx): void {
  const authRole = new URL(value.DATABASE_URL_AUTH).username
  const appRole = new URL(value.DATABASE_URL_APP).username

  if (authRole !== 'auth_service') {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_URL_AUTH'],
      message: 'debe usar el rol auth_service',
    })
  }

  if (appRole !== 'app_user') {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_URL_APP'],
      message: 'debe usar el rol app_user',
    })
  }

  if (value.DATABASE_URL_AUTH === value.DATABASE_URL_APP) {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_URL_APP'],
      message: 'no puede coincidir con DATABASE_URL_AUTH',
    })
  }

  if (value.NODE_ENV === 'production' && !value.BETTER_AUTH_URL.startsWith('https://')) {
    ctx.addIssue({
      code: 'custom',
      path: ['BETTER_AUTH_URL'],
      message: 'debe ser https en producción',
    })
  }

  try {
    parseKeyPair(value.JWT_PRIVATE_KEY_B64, value.JWT_PUBLIC_KEY_B64)
  } catch (error) {
    ctx.addIssue({
      code: 'custom',
      path: ['JWT_PRIVATE_KEY_B64'],
      message: `par de claves inválido: ${(error as Error).message}`,
    })
  }
}

export const BASE_ENV_KEYS = [
  'NODE_ENV',
  'HOST',
  'PORT',
  'DATABASE_URL_AUTH',
  'DATABASE_URL_APP',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'TRUSTED_ORIGINS',
  'SESSION_TTL_SECONDS',
  'SESSION_UPDATE_AGE_SECONDS',
  'ACCESS_TOKEN_TTL_SECONDS',
  'JWT_ISSUER',
  'JWT_AUDIENCE',
  'JWT_KID',
  'JWT_PRIVATE_KEY_B64',
  'JWT_PUBLIC_KEY_B64',
] as const
