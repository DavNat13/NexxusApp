import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { config } from '../src/config/env.js'
import { sha256 } from '../src/auth/hash.js'
import { parseConfig } from '../src/config/schema.js'
import { passwordResetCode } from '../src/mail/templates.js'
import { auditAttempts, closeAudit } from './helpers/audit.js'
import { createFakeMailer, type FakeMailer } from './helpers/mailer.js'
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
const email = newEmail()
const ip = '203.0.113.7'
let server: TestServer
let mailer: FakeMailer

function post(procedure: string, input: unknown) {
  return postProcedure(server.app, procedure, input, {
    'x-forwarded-for': ip,
  })
}

beforeAll(async () => {
  mailer = createFakeMailer()
  server = await createTestServer({ mailer })
  await post('auth.register', { name: 'Ana', email, password })
})

afterAll(async () => {
  await deleteUser(server.pools, email)
  await server.pools.auth`
    DELETE FROM auth.verification WHERE identifier = ${`forget-password-otp-${email}`}
  `
  await clearResetThrottle(server.pools, [email], [ip])
  await closeAudit()
  await closeTestServer(server)
})

describe('límite de solicitudes', () => {
  it('tras cinco códigos responde igual pero no vuelve a enviar', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await post('auth.requestPasswordReset', { email })
      expect(envelope(res).result?.data).toEqual({ ok: true })
    }

    expect(mailer.messages).toHaveLength(5)

    const sixth = await post('auth.requestPasswordReset', { email })
    expect(envelope(sixth).result?.data).toEqual({ ok: true })
    expect(mailer.messages).toHaveLength(5)

    const attempts = await auditAttempts(sha256(`reset-account:${email}`))
    expect(attempts.at(-1)?.reason).toBe('locked')
  })
})

describe('configuración y plantilla', () => {
  it('sin SMTP en producción no arranca; en desarrollo queda desactivado', () => {
    const base: NodeJS.ProcessEnv = {
      NODE_ENV: 'production',
      DATABASE_URL_AUTH: config.databaseUrlAuth,
      DATABASE_URL_APP: config.databaseUrlApp,
      BETTER_AUTH_SECRET: config.betterAuthSecret,
      BETTER_AUTH_URL: 'https://api.example.com',
      JWT_PRIVATE_KEY_B64: config.jwtPrivateKeyB64,
      JWT_PUBLIC_KEY_B64: config.jwtPublicKeyB64,
      ALLOWED_EMAILS: 'alguien@example.com',
    }

    expect(() => parseConfig(base)).toThrow(/SMTP_HOST/)
    expect(parseConfig({ ...base, NODE_ENV: 'development' }).mail).toBeNull()
  })

  it('la plantilla no contiene el correo ni enlaces', () => {
    const content = passwordResetCode('123456')
    expect(content.text).toContain('123456')
    expect(content.text).toContain('15 minutos')
    expect(content.text).not.toContain('@')
    expect(content.html).not.toContain('http')
  })
})
