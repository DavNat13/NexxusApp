import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createProxyTrust, isPrivateAddress } from '../src/http/proxy.js'
import { sha256 } from '../src/auth/hash.js'
import { auditAttempts, closeAudit } from './helpers/audit.js'
import {
  closeTestServer,
  createTestServer,
  deleteUser,
  newEmail,
  type TestServer,
} from './helpers/server.js'
import { clearThrottle } from './helpers/throttle.js'

describe('createProxyTrust', () => {
  it('confía solo en saltos privados dentro del límite', () => {
    const trust = createProxyTrust(1)

    expect(trust('10.0.0.2', 0)).toBe(true)
    expect(trust('fdaa::1', 0)).toBe(true)
    expect(trust('198.51.100.7', 0)).toBe(false)
    expect(trust('10.0.0.2', 1)).toBe(false)
  })

  it('reconoce redes privadas sin confundir públicas', () => {
    expect(isPrivateAddress('127.0.0.1')).toBe(true)
    expect(isPrivateAddress('::1')).toBe(true)
    expect(isPrivateAddress('::ffff:192.168.1.4')).toBe(true)
    expect(isPrivateAddress('172.20.0.1')).toBe(true)
    expect(isPrivateAddress('172.32.0.1')).toBe(false)
    expect(isPrivateAddress('8.8.8.8')).toBe(false)
    expect(isPrivateAddress('2001:db8::1')).toBe(false)
    expect(isPrivateAddress('no-es-una-ip')).toBe(false)
  })
})

const email = newEmail()
const password = 'clave-segura-123'
const spoofed = '198.51.100.10'
const publicSocket = '203.0.113.50'

let server: TestServer

beforeAll(async () => {
  server = await createTestServer()
})

afterAll(async () => {
  await deleteUser(server.pools, email)
  await clearThrottle(server.pools, [email], [publicSocket, spoofed])
  await closeAudit()
  await closeTestServer(server)
})

function login(remoteAddress: string) {
  return server.app.inject({
    method: 'POST',
    url: '/trpc/auth.login',
    headers: { 'x-forwarded-for': spoofed },
    remoteAddress,
    payload: { email, password },
  })
}

describe('IP real detrás del proxy', () => {
  it('ignora X-Forwarded-For si el socket es público', async () => {
    await login(publicSocket)

    const attempts = await auditAttempts(sha256(`account:${email}`))
    expect(attempts.at(-1)?.ip_address).toBe(publicSocket)
  })

  it('usa la IP reenviada cuando el socket es privado', async () => {
    await login('10.0.0.2')

    const attempts = await auditAttempts(sha256(`account:${email}`))
    expect(attempts.at(-1)?.ip_address).toBe(spoofed)
  })
})
