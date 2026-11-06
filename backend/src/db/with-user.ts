import type postgres from 'postgres'

/**
 * Ejecuta una operación como `app_user` con el contexto de RLS fijado.
 * El `userId` debe venir de una sesión verificada, nunca del cliente.
 */
export async function withUser<T>(
  pool: postgres.Sql,
  userId: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return pool.begin(async (tx) => {
    await tx`SELECT set_config('app.user_id', ${userId}, true)`
    return fn(tx)
  }) as Promise<T>
}
