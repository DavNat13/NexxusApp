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
  await asUser(ana.id, (tx) =>
    tx`INSERT INTO profiles (user_id, display_name) VALUES (${ana.id}, 'Ana')`,
  )
  await asUser(beto.id, (tx) =>
    tx`INSERT INTO profiles (user_id, display_name) VALUES (${beto.id}, 'Beto')`,
  )
})

afterAll(async () => {
  await removeUsers(ana, beto)
  await closeConnections()
})

describe('test 1: aislamiento entre usuarios', () => {
  it('Ana solo ve su propia fila', async () => {
    const rows = await asUser(ana.id, (tx) => tx`SELECT user_id FROM profiles`)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.user_id).toBe(ana.id)
  })

  it('Ana no puede leer el perfil de Beto ni pidiéndolo por id', async () => {
    const rows = await asUser(
      ana.id,
      (tx) => tx`SELECT display_name FROM profiles WHERE user_id = ${beto.id}`,
    )
    expect(rows).toHaveLength(0)
  })

  it('Beto solo ve la suya', async () => {
    const rows = await asUser(beto.id, (tx) => tx`SELECT user_id FROM profiles`)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.user_id).toBe(beto.id)
  })
})
