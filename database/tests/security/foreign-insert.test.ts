import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  asUser,
  closeConnections,
  createUsers,
  newUser,
  removeUsers,
} from '../helpers/db.js'

const ana = newUser()
const beto = newUser()

beforeAll(async () => {
  await createUsers(ana, beto)
})

afterAll(async () => {
  await removeUsers(ana, beto)
  await closeConnections()
})

describe('test 3: no se puede insertar a nombre de otro', () => {
  it('rechaza un INSERT con el user_id de Beto desde la sesión de Ana', async () => {
    await expect(
      asUser(ana.id, (tx) =>
        tx`INSERT INTO profiles (user_id, display_name) VALUES (${beto.id}, 'Intruso')`,
      ),
    ).rejects.toThrow(/row-level security/)
  })

  it('Beto sigue sin perfil después del intento', async () => {
    const rows = await asUser(beto.id, (tx) => tx`SELECT user_id FROM profiles`)
    expect(rows).toHaveLength(0)
  })

  it('el INSERT propio sí funciona', async () => {
    const rows = await asUser(
      ana.id,
      (tx) =>
        tx`INSERT INTO profiles (user_id, display_name) VALUES (${ana.id}, 'Ana') RETURNING user_id`,
    )
    expect(rows[0]?.user_id).toBe(ana.id)
  })
})
