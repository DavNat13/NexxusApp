import { resolve } from 'node:path'
import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: resolve(process.cwd(), '../.env'), quiet: true })

const url = process.env.DATABASE_URL_MIGRATOR

if (!url) {
  throw new Error('Falta DATABASE_URL_MIGRATOR en .env')
}

export default defineConfig({
  schema: './src/schema/*.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
