import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { client, db } from '../src/db.js'

try {
  await migrate(db, { migrationsFolder: 'migrations' })
  console.log('Migraciones aplicadas')
} finally {
  await client.end()
}
