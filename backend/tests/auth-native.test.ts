import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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
import { clearThrottle } from './helpers/throttle.js'
import { bearer, nativeHeaders, type AuthResult } from './helpers/native.js'

const webEmail = newEmail()
const nativeEmail = newEmail()
const extraEmail = newEmail()
const password = 'clave-segura-123'

let server: TestServer
let webCookie = ''
let nativeAccess = ''
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
    nativeHeaders(),
  )
  const body = envelope<AuthResult>(mobile)
  nativeAccess = body.result?.data.accessToken ?? ''
  nativeRefresh = body.result?.data.refreshToken ?? ''
})

afterAll(async () => {
  for (const email of [webEmail, nativeEmail, extraEmail]) {
    await deleteUser(server.pools, email)
  }
  await clearThrottle(server.pools, [webEmail, nativeEmail], [
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
  ])
  await closeTestServer(server)
})

describe('registro nativo', () => {
  it('devuelve refreshToken y no emite cookie', async () => {
    const res = await postProcedure(
      server.app,
      'auth.register',
      { name: 'Otra', email: extraEmail, password },
      nativeHeaders(),
    )
    const body = envelope<AuthResult>(res)

    expect(body.result?.data.refreshToken).toBeTruthy()
    expect(res.headers['set-cookie']).toBeUndefined()
  })

  it('el access token identifica al usuario con la cabecera nativa', async () => {
    const res = await getProcedure(
      server.app,
      'auth.me',
      nativeHeaders(bearer(nativeAccess)),
    )

    expect(envelope<{ user: { email: string } }>(res).result?.data.user.email).toBe(
      nativeEmail,
    )
  })

  it('una cookie web no autentica una petición nativa', async () => {
    const res = await getProcedure(
      server.app,
      'auth.me',
      nativeHeaders({ cookie: webCookie }),
    )

    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
  })
})

describe('refresh nativo', () => {
  it('canjea el refresh por un access token nuevo', async () => {
    const res = await postProcedure(
      server.app,
      'auth.refresh',
      { refreshToken: nativeRefresh },
      nativeHeaders(),
    )
    const body = envelope<AuthResult>(res)
    const renewed = body.result?.data.accessToken ?? ''

    expect(renewed).toBeTruthy()
    expect(renewed).not.toBe(nativeAccess)
    expect(body.result?.data.refreshToken).toBe(nativeRefresh)
    expect(res.headers['set-cookie']).toBeUndefined()

    const me = await getProcedure(server.app, 'auth.me', nativeHeaders(bearer(renewed)))
    expect(envelope<{ user: { email: string } }>(me).result?.data.user.email).toBe(
      nativeEmail,
    )
  })

  it('rechaza un token opaco sin firma', async () => {
    const res = await postProcedure(
      server.app,
      'auth.refresh',
      { refreshToken: 'token-opaco-sin-firma' },
      nativeHeaders(),
    )

    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
  })

  it('rechaza un JWT de acceso como refresh', async () => {
    const res = await postProcedure(
      server.app,
      'auth.refresh',
      { refreshToken: nativeAccess },
      nativeHeaders(),
    )

    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
  })

  it('sin refreshToken responde UNAUTHORIZED', async () => {
    const res = await postProcedure(server.app, 'auth.refresh', {}, nativeHeaders())

    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
  })
})
