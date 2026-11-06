import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sha256 } from '../src/auth/hash.js'
import {
  closeTestServer,
  createTestServer,
  deleteUser,
  envelope,
  newEmail,
  postProcedure,
  type TestServer,
} from './helpers/server.js'
import { clearThrottle } from './helpers/throttle.js'

const unknown = newEmail()
const known = newEmail()
const password = 'clave-segura-123'
const lockedIp = '203.0.113.10'
const resetIp = '203.0.113.11'

let server: TestServer

beforeAll(async () => {
  server = await createTestServer()
})

afterAll(async () => {
  await deleteUser(server.pools, known)
  await clearThrottle(server.pools, [unknown, known], [lockedIp, resetIp])
  await closeTestServer(server)
})

function attempt(address: string, secret: string, ip: string) {
  return postProcedure(
    server.app,
    'auth.login',
    { email: address, password: secret },
    { 'x-forwarded-for': ip },
  )
}

describe('bloqueo por intentos', () => {
  it('bloquea la cuenta tras 5 fallos', async () => {
    for (let index = 0; index < 5; index += 1) {
      const res = await attempt(unknown, 'contraseña-equivocada', lockedIp)
      expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
    }

    const blocked = await attempt(unknown, 'contraseña-equivocada', lockedIp)
    const body = envelope(blocked)

    expect(body.error?.data.code).toBe('TOO_MANY_REQUESTS')
    expect(body.error?.message).toMatch(/Demasiados intentos/)
  })

  it('un login correcto limpia los contadores', async () => {
    await postProcedure(server.app, 'auth.register', { name: 'Ana', email: known, password })

    for (let index = 0; index < 4; index += 1) {
      const res = await attempt(known, 'contraseña-equivocada', resetIp)
      expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
    }

    const ok = await attempt(known, password, resetIp)
    expect(envelope<{ user: { email: string } }>(ok).result?.data.user.email).toBe(known)

    const rows = await server.pools.auth`
      SELECT 1 FROM auth.login_throttle WHERE identifier_hash = ${sha256(`account:${known}`)}
    `
    expect(rows.length).toBe(0)
  })
})
