import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseConfig } from '../src/config/schema.js'
import { config } from '../src/config/env.js'
import { sha256 } from '../src/auth/hash.js'
import { auditAttempts, closeAudit } from './helpers/audit.js'
import {
  closeTestServer,
  createTestServer,
  deleteUser,
  envelope,
  newEmail,
  postProcedure,
  type TestServer,
} from './helpers/server.js'

const allowed = newEmail()
const blocked = newEmail()
const password = 'clave-segura-123'
/** IP propia del archivo: el test de bloqueo no contamina a los demás. */
const ip = '198.51.100.10'

let server: TestServer
let blockedMessage = ''

function register(email: string) {
  return postProcedure(
    server.app,
    'auth.register',
    { name: 'Ana', email, password },
    { 'x-forwarded-for': ip },
  )
}

async function clearRegisterIp(): Promise<void> {
  await server.pools.auth`
    DELETE FROM auth.login_throttle
    WHERE identifier_hash = ${sha256(`register-ip:${ip}`)}
  `
}

function productionEnv(allowedEmails: string): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    DATABASE_URL_AUTH: config.databaseUrlAuth,
    DATABASE_URL_APP: config.databaseUrlApp,
    BETTER_AUTH_SECRET: config.betterAuthSecret,
    BETTER_AUTH_URL: 'https://api.example.com',
    JWT_PRIVATE_KEY_B64: config.jwtPrivateKeyB64,
    JWT_PUBLIC_KEY_B64: config.jwtPublicKeyB64,
    ALLOWED_EMAILS: allowedEmails,
  }
}

beforeAll(async () => {
  server = await createTestServer({ allowedEmails: [allowed] })
})

afterAll(async () => {
  await deleteUser(server.pools, allowed)
  await deleteUser(server.pools, blocked)
  await clearRegisterIp()
  await closeAudit()
  await closeTestServer(server)
})

describe('registro cerrado', () => {
  it('crea la cuenta si el correo está en la lista', async () => {
    const res = await register(allowed)
    const body = envelope<{ user: { email: string } }>(res)

    expect(body.result?.data.user.email).toBe(allowed)
  })

  it('rechaza un correo no permitido sin crear usuario', async () => {
    const res = await register(blocked)
    const body = envelope(res)
    blockedMessage = body.error?.message ?? ''

    expect(body.error?.data.code).toBe('BAD_REQUEST')
    expect(blockedMessage).toBe('No se pudo crear la cuenta.')

    const rows = await server.pools.auth`
      SELECT 1 FROM auth."user" WHERE lower(email) = ${blocked}
    `
    expect(rows).toHaveLength(0)

    const attempts = await auditAttempts(sha256(`account:${blocked}`))
    expect(attempts.at(-1)?.reason).toBe('not_allowed')
  })

  it('un correo duplicado responde igual que uno no permitido', async () => {
    const res = await register(allowed)
    const body = envelope(res)

    expect(body.error?.message).toBe(blockedMessage)
    expect(body.error?.data.code).toBe('BAD_REQUEST')
  })

  it('bloquea la IP tras diez intentos fallidos', async () => {
    await clearRegisterIp()

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await register(newEmail())
      expect(envelope(res).error?.data.code).toBe('BAD_REQUEST')
    }

    const lockedEmail = newEmail()
    const locked = await register(lockedEmail)
    expect(envelope(locked).error?.data.code).toBe('TOO_MANY_REQUESTS')

    const attempts = await auditAttempts(sha256(`account:${lockedEmail}`))
    expect(attempts.at(-1)?.reason).toBe('locked')
  })
})

describe('configuración de la lista', () => {
  it('en producción exige ALLOWED_EMAILS no vacía', () => {
    expect(() => parseConfig(productionEnv(''))).toThrow(/ALLOWED_EMAILS/)
  })

  it('rechaza correos mal formados en la lista', () => {
    expect(() => parseConfig(productionEnv('no-es-un-email'))).toThrow(
      /correo inválido/,
    )
  })
})
