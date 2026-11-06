import type postgres from 'postgres'

export interface PublicUser {
  id: string
  email: string
  name: string
}

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
