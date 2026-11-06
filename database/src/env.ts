import { resolve } from 'node:path'
import { config } from 'dotenv'
import { z } from 'zod'

config({ path: resolve(import.meta.dirname, '../../.env'), quiet: true })

const envSchema = z.object({
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive(),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_SUPERUSER: z.string().min(1),
  POSTGRES_SUPERUSER_PASSWORD: z.string().min(1),
  DATABASE_URL_MIGRATOR: z.url(),
  DATABASE_URL_AUTH: z.url(),
  DATABASE_URL_APP: z.url(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const detail = z.prettifyError(parsed.error)
  throw new Error(`Variables de entorno inválidas:\n${detail}`)
}

export const env = parsed.data

export const superuserUrl =
  `postgres://${env.POSTGRES_SUPERUSER}:${encodeURIComponent(env.POSTGRES_SUPERUSER_PASSWORD)}` +
  `@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`
