import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  asUser,
  closeConnections,
  createUsers,
  newUser,
  removeUsers,
  superuserSql,
} from '../helpers/db.js'

const ana = newUser()
let entryId: number

beforeAll(async () => {
  await createUsers(ana)
  await asUser(
    ana.id,
    (tx) => tx`INSERT INTO auth_audit_log (user_id, event) VALUES (${ana.id}, 'login')`,
  )
  const rows = await superuserSql`
    SELECT id FROM auth_audit_log WHERE user_id = ${ana.id} ORDER BY id DESC LIMIT 1
  `
  entryId = Number(rows[0]?.id)
})

afterAll(async () => {
  await removeUsers(ana)
  await superuserSql`TRUNCATE auth_audit_log RESTART IDENTITY`
  await closeConnections()
})

describe('test 4: auth_audit_log es append-only', () => {
  it('app_user no puede actualizar', async () => {
    await expect(
      asUser(ana.id, (tx) => tx`UPDATE auth_audit_log SET event = 'manipulado'`),
    ).rejects.toThrow(/permission denied/)
  })

  it('app_user no puede borrar', async () => {
    await expect(asUser(ana.id, (tx) => tx`DELETE FROM auth_audit_log`)).rejects.toThrow(
      /permission denied/,
    )
  })

  it('ni siquiera un superusuario puede modificar una fila (trigger)', async () => {
    await expect(
      superuserSql`UPDATE auth_audit_log SET event = 'manipulado' WHERE id = ${entryId}`,
    ).rejects.toThrow(/append-only/)
  })

  it('el intento anterior no cambió nada', async () => {
    const rows = await superuserSql`SELECT event FROM auth_audit_log WHERE id = ${entryId}`
    expect(rows[0]?.event).toBe('login')
  })
})
