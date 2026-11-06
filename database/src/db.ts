import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from './env.js'

export function createClient(url: string): postgres.Sql {
  return postgres(url, { max: 1, onnotice: () => {} })
}

/** Conexión de migraciones y scripts. Nunca se usa desde la API. */
export const client = createClient(env.DATABASE_URL_MIGRATOR)
export const db = drizzle({ client })
