import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  authSql,
  closeConnections,
  createUsers,
  newUser,
  removeUsers,
  superuserSql,
  truncateAudit,
} from '../helpers/db.js'

const ana = newUser()
let entryId: number

beforeAll(async () => {
  await createUsers(ana)
  await authSql`
    INSERT INTO audit.auth_event (user_id, event, outcome, request_id)
    VALUES (${ana.id}, 'login', 'success', 'test-request')
  `
  const rows = await superuserSql`
    SELECT id FROM audit.auth_event WHERE user_id = ${ana.id} ORDER BY id DESC LIMIT 1
  `
  entryId = Number(rows[0]?.id)
})

afterAll(async () => {
  await removeUsers(ana)
  await truncateAudit()
  await closeConnections()
})

describe('test 4: audit.auth_event es append-only', () => {
  it('auth_service no puede actualizar ni borrar', async () => {
    await expect(
      authSql`UPDATE audit.auth_event SET outcome = 'failure' WHERE id = ${entryId}`,
    ).rejects.toThrow(/permission denied/)

    await expect(
      authSql`DELETE FROM audit.auth_event WHERE id = ${entryId}`,
    ).rejects.toThrow(/permission denied/)
  })

  it('ni siquiera un superusuario puede modificar una fila (trigger)', async () => {
    await expect(
      superuserSql`UPDATE audit.auth_event SET outcome = 'failure' WHERE id = ${entryId}`,
    ).rejects.toThrow(/append-only/)

    await expect(
      superuserSql`DELETE FROM audit.auth_event WHERE id = ${entryId}`,
    ).rejects.toThrow(/append-only/)
  })

  it('TRUNCATE está bloqueado salvo en mantenimiento explícito', async () => {
    await expect(superuserSql`TRUNCATE audit.auth_event`).rejects.toThrow(/append-only/)
  })

  it('el intento anterior no cambió nada', async () => {
    const rows = await superuserSql`SELECT outcome FROM audit.auth_event WHERE id = ${entryId}`
    expect(rows[0]?.outcome).toBe('success')
  })
})
