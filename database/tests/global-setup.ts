import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { client, db } from '../src/db.js'

export default async function setup(): Promise<void> {
  await migrate(db, { migrationsFolder: 'migrations' })
  await client.end()
}
