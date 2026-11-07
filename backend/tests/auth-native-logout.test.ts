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
import { clearThrottle } from './helpers/throttle.js'
import { native, type AuthResult } from './helpers/native.js'

const webEmail = newEmail()
const nativeEmail = newEmail()
const password = 'clave-segura-123'

let server: TestServer
let webCookie = ''
let nativeRefresh = ''

beforeAll(async () => {
  server = await createTestServer()

  const web = await postProcedure(server.app, 'auth.register', {
    name: 'Web',
    email: webEmail,
    password,
  })
  webCookie = cookieHeader(web)

  const mobile = await postProcedure(
    server.app,
    'auth.register',
    { name: 'Móvil', email: nativeEmail, password },
    native,
  )
  nativeRefresh = envelope<AuthResult>(mobile).result?.data.refreshToken ?? ''
})

afterAll(async () => {
  await deleteUser(server.pools, webEmail)
  await deleteUser(server.pools, nativeEmail)
  await clearThrottle(server.pools, [webEmail, nativeEmail], [
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
  ])
  await closeTestServer(server)
})

describe('logout nativo', () => {
  it('revoca la sesión del refresh enviado', async () => {
    const out = await postProcedure(
      server.app,
      'auth.logout',
      { refreshToken: nativeRefresh },
      native,
    )
    expect(envelope<{ ok: boolean }>(out).result?.data.ok).toBe(true)
    expect(out.headers['set-cookie']).toBeUndefined()

    const res = await postProcedure(
      server.app,
      'auth.refresh',
      { refreshToken: nativeRefresh },
      native,
    )
    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
  })

  it('sin token responde ok y no falla', async () => {
    const res = await postProcedure(server.app, 'auth.logout', {}, native)

    expect(envelope<{ ok: boolean }>(res).result?.data.ok).toBe(true)
  })
})

describe('web sin cambios', () => {
  it('el registro web emite cookie y no devuelve refreshToken', async () => {
    const email = newEmail()
    const res = await postProcedure(server.app, 'auth.register', {
      name: 'Web dos',
      email,
      password,
    })
    const body = envelope<AuthResult>(res)

    expect(cookieHeader(res)).toContain('session_token')
    expect(body.result?.data.refreshToken).toBeUndefined()
    await deleteUser(server.pools, email)
  })

  it('el refresh web sigue usando la cookie', async () => {
    const res = await postProcedure(server.app, 'auth.refresh', {}, { cookie: webCookie })

    expect(envelope<AuthResult>(res).result?.data.accessToken).toBeTruthy()
  })
})
