import postgres from 'postgres'
import type { Config } from '../config/schema.js'

export interface Pools {
  auth: postgres.Sql
  app: postgres.Sql
  close(): Promise<void>
}

const baseOptions = {
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 30 * 60,
  onnotice: () => {},
} as const

export function createPools(config: Config): Pools {
  const auth = postgres(config.databaseUrlAuth, {
    ...baseOptions,
    max: 5,
    connection: { application_name: 'nexxus-auth' },
  })

  const app = postgres(config.databaseUrlApp, {
    ...baseOptions,
    max: 10,
    connection: { application_name: 'nexxus-app' },
  })

  return {
    auth,
    app,
    close: async () => {
      await Promise.all([auth.end(), app.end()])
    },
  }
}
