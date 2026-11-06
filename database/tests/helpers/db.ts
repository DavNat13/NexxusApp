import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { env, superuserUrl } from '../../src/env.js'

export const appSql = postgres(env.DATABASE_URL_APP, { max: 4, onnotice: () => {} })
export const authSql = postgres(env.DATABASE_URL_AUTH, { max: 4, onnotice: () => {} })
export const ownerSql = postgres(env.DATABASE_URL_MIGRATOR, { max: 4, onnotice: () => {} })
export const superuserSql = postgres(superuserUrl, { max: 2, onnotice: () => {} })

export interface TestUser {
  id: string
  email: string
}

export function newUser(): TestUser {
  const id = randomUUID()
  return { id, email: `test-${id}@example.com` }
}

export async function createUsers(...users: TestUser[]): Promise<void> {
  for (const user of users) {
    await ownerSql`
      INSERT INTO auth."user" (id, name, email, updated_at)
      VALUES (${user.id}, 'Test', ${user.email}, now())
    `
  }
}

export async function removeUsers(...users: TestUser[]): Promise<void> {
  for (const user of users) {
    await ownerSql`DELETE FROM auth."user" WHERE id = ${user.id}`
  }
}

/** Ejecuta SQL como app_user dentro de una transacción con el contexto fijado. */
export async function asUser<T>(
  userId: string | null,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return appSql.begin(async (tx) => {
    if (userId !== null) {
      await tx`SELECT set_config('app.user_id', ${userId}, true)`
    }
    return fn(tx)
  }) as Promise<T>
}

/** TRUNCATE de auditoría: el único atajo del harness, nunca del runtime. */
export async function truncateAudit(): Promise<void> {
  await superuserSql.begin(async (tx) => {
    await tx`SELECT set_config('app.maintenance', 'on', true)`
    await tx`TRUNCATE audit.auth_event, audit.auth_attempt RESTART IDENTITY`
  })
}

export async function closeConnections(): Promise<void> {
  await Promise.all([appSql.end(), authSql.end(), ownerSql.end(), superuserSql.end()])
}
