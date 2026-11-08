import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sha256 } from '../src/auth/hash.js'
import { auditAttempts, auditEvents, closeAudit } from './helpers/audit.js'
import { codeFrom, createFakeMailer, type FakeMailer } from './helpers/mailer.js'
import {
  closeTestServer,
  cookieHeader,
  createTestServer,
  deleteUser,
  envelope,
  getProcedure,
  newEmail,
  postProcedure,
  type TestServer,
} from './helpers/server.js'
import { clearResetThrottle } from './helpers/throttle.js'

const password = 'clave-segura-123'
const nextPassword = 'clave-nueva-456'
const emails: string[] = []
const ips: string[] = []
let server: TestServer
let mailer: FakeMailer
function ip(n: number): string {
  const value = `203.0.113.${n}`
  ips.push(value)
  return value
}

function email(): string {
  const value = newEmail()
  emails.push(value)
  return value
}

function post(procedure: string, input: unknown, source: string) {
  return postProcedure(server.app, procedure, input, {
    'x-forwarded-for': source,
  })
}

function request(address: string, source: string) {
  return post('auth.requestPasswordReset', { email: address }, source)
}

function reset(address: string, code: string, next: string, source: string) {
  return post(
    'auth.resetPassword',
    { email: address, code, password: next },
    source,
  )
}

function identifier(address: string): string {
  return `forget-password-otp-${address}`
}
beforeAll(async () => {
  mailer = createFakeMailer()
  server = await createTestServer({ mailer })
})

afterAll(async () => {
  for (const address of emails) {
    await deleteUser(server.pools, address)
    await server.pools.auth`
      DELETE FROM auth.verification WHERE identifier = ${identifier(address)}
    `
  }
  await clearResetThrottle(server.pools, emails, ips)
  await closeAudit()
  await closeTestServer(server)
})
describe('auth.resetPassword', () => {
  it('cambia la contraseña, revoca sesiones y avisa', async () => {
    const address = email()
    const source = ip(4)
    const created = await post('auth.register', { name: 'Ana', email: address, password }, source)
    const userId = envelope<{ user: { id: string } }>(created).result!.data.user.id

    await request(address, source)
    const code = codeFrom(mailer.messages.at(-1)!)
    const res = await reset(address, code, nextPassword, source)

    expect(envelope(res).result?.data).toEqual({ ok: true })
    expect(mailer.messages.at(-1)?.subject).toBe('Tu contraseña de Nexxus cambió')

    const me = await getProcedure(server.app, 'auth.me', {
      cookie: cookieHeader(created),
      'x-forwarded-for': source,
    })
    expect(envelope(me).error?.data.code).toBe('UNAUTHORIZED')

    const oldLogin = await post('auth.login', { email: address, password }, source)
    expect(envelope(oldLogin).error?.data.code).toBe('UNAUTHORIZED')

    const newLogin = await post(
      'auth.login',
      { email: address, password: nextPassword },
      source,
    )
    expect(envelope(newLogin).result).toBeDefined()

    const events = await auditEvents(userId)
    const resetEvent = events.find((event) => event.event === 'password_reset')
    expect(resetEvent?.outcome).toBe('success')
  })

  it('bloquea el código tras tres intentos fallidos', async () => {
    const address = email()
    const source = ip(5)
    await post('auth.register', { name: 'Ana', email: address, password }, source)
    await request(address, source)
    const code = codeFrom(mailer.messages.at(-1)!)

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await reset(address, '000000', nextPassword, source)
      expect(envelope(res).error?.message).toBe(
        'El código no es válido o ha caducado.',
      )
    }

    const fourth = await reset(address, code, nextPassword, source)
    expect(envelope(fourth).error?.data.code).toBe('BAD_REQUEST')

    const attempts = await auditAttempts(sha256(`reset-account:${address}`))
    expect(attempts.at(-1)?.reason).toBe('too_many_attempts')
  })

  it('rechaza un código caducado sin distinguirlo de uno inválido', async () => {
    const address = email()
    const source = ip(6)
    await post('auth.register', { name: 'Ana', email: address, password }, source)
    await request(address, source)
    const code = codeFrom(mailer.messages.at(-1)!)

    await server.pools.auth`
      UPDATE auth.verification
      SET expires_at = now() - interval '1 minute'
      WHERE identifier = ${identifier(address)}
    `

    const res = await reset(address, code, nextPassword, source)
    expect(envelope(res).error?.message).toBe(
      'El código no es válido o ha caducado.',
    )

    const attempts = await auditAttempts(sha256(`reset-account:${address}`))
    expect(attempts.at(-1)?.reason).toBe('expired')
  })
})
