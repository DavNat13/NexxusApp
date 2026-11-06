import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  closeTestServer,
  cookieHeader,
  createTestServer,
  deleteUser,
  envelope,
  newEmail,
  postProcedure,
  type TestServer,
} from './helpers/server.js'

const email = newEmail()
const password = 'clave-segura-123'
const created: string[] = [email]
let server: TestServer

beforeAll(async () => {
  server = await createTestServer()
})

afterAll(async () => {
  for (const address of created) {
    await deleteUser(server.pools, address)
  }
  await closeTestServer(server)
})

describe('auth.register', () => {
  it('crea la cuenta, normaliza el email y emite cookie', async () => {
    const res = await postProcedure(server.app, 'auth.register', {
      name: 'Ana',
      email: email.toUpperCase(),
      password,
    })

    const body = envelope<{ user: { id: string; email: string; name: string } }>(res)
    expect(body.error).toBeUndefined()
    expect(body.result?.data.user.email).toBe(email)
    expect(body.result?.data.user.name).toBe('Ana')
    expect(cookieHeader(res)).toMatch(/session_token=/)
  })

  it('no revela si el email ya existe', async () => {
    const res = await postProcedure(server.app, 'auth.register', {
      name: 'Otra',
      email,
      password,
    })

    const body = envelope(res)
    expect(body.result).toBeUndefined()
    expect(body.error?.data.code).toBe('BAD_REQUEST')
    expect(body.error?.message).toBe('No se pudo crear la cuenta.')
  })

  it('rechaza contraseñas cortas antes de tocar la base de datos', async () => {
    const res = await postProcedure(server.app, 'auth.register', {
      name: 'Ana',
      email: newEmail(),
      password: 'corta',
    })

    expect(envelope(res).error?.data.code).toBe('BAD_REQUEST')
  })

  it('rechaza un email con carga SQL sin ejecutarla', async () => {
    const res = await postProcedure(server.app, 'auth.register', {
      name: 'Ana',
      email: "o'rne'; DROP TABLE auth.\"user\";--@example.com",
      password,
    })

    expect(envelope(res).error?.data.code).toBe('BAD_REQUEST')

    const valid = newEmail()
    created.push(valid)

    const check = await postProcedure(server.app, 'auth.register', {
      name: 'Luis',
      email: valid,
      password,
    })
    const body = envelope<{ user: { id: string } }>(check)
    expect(body.result?.data.user.id).toBeTruthy()
  })
})
