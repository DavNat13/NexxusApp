import { afterAll, describe, expect, it } from 'vitest'
import { appSql, authSql, closeConnections, ownerSql } from '../helpers/db.js'

afterAll(async () => {
  await closeConnections()
})

describe('acceso a la auditoría', () => {
  it('app_user no puede leer los eventos', async () => {
    await expect(appSql`SELECT 1 FROM audit.auth_event LIMIT 1`).rejects.toThrow(
      /permission denied/,
    )
  })

  it('app_user no puede escribir eventos', async () => {
    await expect(
      appSql`
        INSERT INTO audit.auth_event (user_id, event, outcome, request_id)
        VALUES ('x', 'login', 'success', 'x')
      `,
    ).rejects.toThrow(/permission denied/)
  })

  it('auth_service escribe pero no lee', async () => {
    await expect(authSql`SELECT 1 FROM audit.auth_event LIMIT 1`).rejects.toThrow(
      /permission denied/,
    )
  })

  it('audit_reader puede leer y no escribir', async () => {
    const rows = await ownerSql.begin(async (tx) => {
      await tx`SET LOCAL ROLE audit_reader`
      return tx`SELECT 1 AS ok FROM audit.auth_event LIMIT 1`
    })
    expect(Array.isArray(rows)).toBe(true)

    await expect(
      ownerSql.begin(async (tx) => {
        await tx`SET LOCAL ROLE audit_reader`
        return tx`
          INSERT INTO audit.auth_event (user_id, event, outcome, request_id)
          VALUES ('x', 'login', 'success', 'x')
        `
      }),
    ).rejects.toThrow(/permission denied/)
  })
})
