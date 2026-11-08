import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sha256 } from '../src/auth/hash.js'
import { auditAttempts, closeAudit } from './helpers/audit.js'
import { codeFrom, createFakeMailer, type FakeMailer } from './helpers/mailer.js'
import {
  closeTestServer,
  createTestServer,
  deleteUser,
  envelope,
  newEmail,
  postProcedure,
  type TestServer,
} from './helpers/server.js'
import { clearResetThrottle } from './helpers/throttle.js'

const password = 'clave-segura-123'
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

function post(procedure: string, input: unknown, address: string) {
  return postProcedure(server.app, procedure, input, {
    'x-forwarded-for': address,
  })
}

function request(address: string, source: string) {
  return post('auth.requestPasswordReset', { email: address }, source)
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

describe('auth.requestPasswordReset', () => {
  it('envía un código hasheado a una cuenta existente', async () => {
    const address = email()
    const source = ip(1)
    await post(
      'auth.register',
      { name: 'Ana', email: address, password },
      source,
    )

    const res = await request(address, source)
    expect(envelope(res).result?.data).toEqual({ ok: true })
    expect(mailer.messages).toHaveLength(1)

    const code = codeFrom(mailer.messages[0]!)
    const [row] = await server.pools.auth<{ value: string }[]>`
      SELECT value FROM auth.verification WHERE identifier = ${identifier(address)}
    `

    expect(row?.value).toContain(':0')
    expect(row?.value).not.toContain(code)
  })

  it('responde igual con un correo inexistente y no envía nada', async () => {
    const address = email()
    const before = mailer.messages.length
    const res = await request(address, ip(2))

    expect(envelope(res).result?.data).toEqual({ ok: true })
    expect(mailer.messages).toHaveLength(before)

    const rows = await server.pools.auth`
      SELECT 1 FROM auth.verification WHERE identifier = ${identifier(address)}
    `
    expect(rows).toHaveLength(0)
  })

  it('si el correo falla, la respuesta no cambia', async () => {
    const address = email()
    const source = ip(3)
    await post(
      'auth.register',
      { name: 'Luis', email: address, password },
      source,
    )

    mailer.fail = true
    const before = mailer.messages.length
    const res = await request(address, source)
    mailer.fail = false

    expect(envelope(res).result?.data).toEqual({ ok: true })
    expect(mailer.messages).toHaveLength(before)

    const attempts = await auditAttempts(sha256(`reset-account:${address}`))
    expect(attempts.at(-1)?.outcome).toBe('success')
  })
})
