import type postgres from 'postgres'

/** Id de la sesión a partir del token opaco que emitió Better Auth. */
export async function findSessionId(
  pool: postgres.Sql,
  token: string,
): Promise<string | null> {
  const [row] = await pool<{ id: string }[]>`
    SELECT id FROM auth.session WHERE token = ${token} LIMIT 1
  `

  return row?.id ?? null
}
