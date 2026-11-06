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

const email = newEmail()
const password = 'clave-segura-123'
let server: TestServer
let cookie = ''

beforeAll(async () => {
  server = await createTestServer()
  const res = await postProcedure(server.app, 'auth.register', {
    name: 'Ana',
    email,
    password,
  })
  cookie = cookieHeader(res)
})

afterAll(async () => {
  await deleteUser(server.pools, email)
  await clearThrottle(server.pools, [email], ['127.0.0.1', '::1', '::ffff:127.0.0.1'])
  await closeTestServer(server)
})

describe('sesión', () => {
  it('sin cookie, me responde UNAUTHORIZED', async () => {
    const res = await getProcedure(server.app, 'auth.me')
    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
  })

  it('con cookie, me devuelve el usuario de la sesión', async () => {
    const res = await getProcedure(server.app, 'auth.me', { cookie })
    const body = envelope<{ user: { id: string; email: string } }>(res)
    expect(body.result?.data.user.email).toBe(email)
    expect(body.result?.data.user.id).toBeTruthy()
  })

  it('rechaza credenciales incorrectas sin revelar la causa', async () => {
    const res = await postProcedure(server.app, 'auth.login', {
      email,
      password: 'contraseña-equivocada',
    })

    const body = envelope(res)
    expect(body.error?.data.code).toBe('UNAUTHORIZED')
    expect(body.error?.message).toBe('Credenciales inválidas.')
    expect(cookieHeader(res)).toBe('')
  })

  it('una carga SQL en la contraseña no rompe nada', async () => {
    const res = await postProcedure(server.app, 'auth.login', {
      email,
      password: `' OR 1=1; DROP TABLE auth."user";--`,
    })

    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
  })

  it('logout invalida la sesión anterior', async () => {
    const out = await postProcedure(server.app, 'auth.logout', {}, { cookie })
    expect(envelope<{ ok: boolean }>(out).result?.data.ok).toBe(true)

    const res = await getProcedure(server.app, 'auth.me', { cookie })
    expect(envelope(res).error?.data.code).toBe('UNAUTHORIZED')
  })

  it('login correcto emite una cookie nueva y válida', async () => {
    const res = await postProcedure(server.app, 'auth.login', { email, password })
    const body = envelope<{ user: { email: string } }>(res)
    expect(body.result?.data.user.email).toBe(email)

    cookie = cookieHeader(res)
    expect(cookie).toMatch(/session_token=/)

    const me = await getProcedure(server.app, 'auth.me', { cookie })
    expect(envelope<{ user: { email: string } }>(me).result?.data.user.email).toBe(email)
  })

  it('el login no distingue mayúsculas en el email', async () => {
    const res = await postProcedure(server.app, 'auth.login', {
      email: email.toUpperCase(),
      password,
    })

    expect(envelope<{ user: { email: string } }>(res).result?.data.user.email).toBe(email)
  })
})
