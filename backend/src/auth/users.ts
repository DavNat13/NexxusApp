import type postgres from 'postgres'
import type { AuthUser } from '@nexxus/shared'

export type PublicUser = AuthUser

/** Lee el usuario por id. Solo se llama con un id ya verificado. */
export async function findUser(
  pool: postgres.Sql,
  userId: string,
): Promise<PublicUser | null> {
  const [row] = await pool<PublicUser[]>`
    SELECT id, email, name FROM auth."user" WHERE id = ${userId} LIMIT 1
  `

  return row ?? null
}
