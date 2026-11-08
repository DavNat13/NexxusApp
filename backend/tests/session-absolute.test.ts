import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { auditEvents, closeAudit } from './helpers/audit.js'
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
import { clearThrottle } from './helpers/throttle.js'

const email = newEmail()
const password = 'clave-segura-123'
let server: TestServer
let cookie = ''
let userId = ''

beforeAll(async () => {
  server = await createTestServer()
  const res = await postProcedure(server.app, 'auth.register', {
    name: 'Ana',
    email,
    password,
  })

  cookie = cookieHeader(res)
  userId = envelope<{ user: { id: string } }>(res).result!.data.user.id
})

afterAll(async () => {
  await deleteUser(server.pools, email)
  await clearThrottle(server.pools, [email], ['127.0.0.1', '::1'])
  await closeAudit()
  await closeTestServer(server)
})

describe('tope absoluto de sesión', () => {
  it('rechaza, revoca y audita una sesión más antigua que el tope', async () => {
    await server.pools.auth`
      UPDATE auth.session SET created_at = now() - interval '91 days'
      WHERE user_id = ${userId}
    `

    const res = await postProcedure(server.app, 'auth.refresh', {}, { cookie })
    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')

    const rows = await server.pools.auth`
      SELECT 1 FROM auth.session WHERE user_id = ${userId}
    `
    expect(rows).toHaveLength(0)

    const events = await auditEvents(userId)
    const failure = events.find(
      (event) => event.event === 'refresh' && event.outcome === 'failure',
    )
    expect(failure?.reason).toBe('absolute_max')
  })
})
