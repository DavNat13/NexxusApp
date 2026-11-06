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
import { auditAttempts, auditEvents, closeAudit } from './helpers/audit.js'
import { clearThrottle } from './helpers/throttle.js'

const email = newEmail()
const password = 'clave-segura-123'
const ip = '203.0.113.20'

let server: TestServer
let userId = ''

beforeAll(async () => {
  server = await createTestServer()

  const res = await postProcedure(server.app, 'auth.register', {
    name: 'Ana',
    email,
    password,
  })

  userId = envelope<{ user: { id: string } }>(res).result?.data.user.id ?? ''

  await postProcedure(
    server.app,
    'auth.login',
    { email, password: 'contraseña-equivocada' },
    { 'x-forwarded-for': ip },
  )

  await postProcedure(
    server.app,
    'auth.login',
    { email, password },
    { 'x-forwarded-for': ip },
  )
})

afterAll(async () => {
  await deleteUser(server.pools, email)
  await clearThrottle(server.pools, [email], [ip])
  await closeAudit()
  await closeTestServer(server)
})

describe('auditoría de autenticación', () => {
  it('registra el alta y el login correcto con actor', async () => {
    const events = await auditEvents(userId)
    const names = events.map((row) => `${row.event}:${row.outcome}`)

    expect(names).toContain('register:success')
    expect(names).toContain('login:success')
    expect(events.every((row) => row.request_id.length > 0)).toBe(true)
  })

  it('registra el intento fallido con hash, nunca con el email', async () => {
    const account = sha256(`account:${email}`)
    const attempts = await auditAttempts(account)

    expect(attempts.length).toBeGreaterThan(0)
    expect(attempts[0]?.event).toBe('login')
    expect(attempts[0]?.outcome).toBe('failure')
    expect(attempts[0]?.reason).toBe('invalid_credentials')
    expect(attempts[0]?.identifier_hash).toBe(account)
    expect(attempts.some((row) => row.identifier_hash.includes(email))).toBe(false)
  })
})
