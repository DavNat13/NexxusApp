import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { ENV_KEYS, parseConfig } from './schema.js'

const rootEnvPath = fileURLToPath(new URL('../../../.env', import.meta.url))

// Se carga en un objeto aparte: las credenciales de migrador del .env raíz
// nunca entran en process.env del proceso de la API.
const fileEnv = loadEnv({ path: rootEnvPath, processEnv: {}, quiet: true }).parsed ?? {}

const allowed: Record<string, string> = {}

for (const key of ENV_KEYS) {
  const value = fileEnv[key]
  if (value !== undefined) allowed[key] = value
}

export const config = parseConfig({ ...allowed, ...process.env })
