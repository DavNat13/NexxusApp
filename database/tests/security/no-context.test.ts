import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  asUser,
  closeConnections,
  createUsers,
  newUser,
  removeUsers,
} from '../helpers/db.js'

const owner = newUser()

beforeAll(async () => {
  await createUsers(owner)
  await asUser(owner.id, (tx) =>
    tx`INSERT INTO profiles (user_id, display_name) VALUES (${owner.id}, 'Sin contexto')`,
  )
})

afterAll(async () => {
  await removeUsers(owner)
  await closeConnections()
})

describe('test 2: sin contexto de usuario no se ve nada', () => {
  it('una consulta sin app.user_id devuelve cero filas', async () => {
    const rows = await asUser(null, (tx) => tx`SELECT user_id FROM profiles`)
    expect(rows).toHaveLength(0)
  })

  it('un contexto vacío tampoco devuelve filas', async () => {
    const rows = await asUser('', (tx) => tx`SELECT user_id FROM profiles`)
    expect(rows).toHaveLength(0)
  })
})
