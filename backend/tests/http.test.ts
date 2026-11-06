import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { config } from '../src/config/env.js'
import {
  closeTestServer,
  createTestServer,
  postProcedure,
  type TestServer,
} from './helpers/server.js'

let server: TestServer

beforeAll(async () => {
  server = await createTestServer()
})

afterAll(async () => {
  await closeTestServer(server)
})

describe('superficie HTTP', () => {
  it('expone un health check que consulta la base de datos', async () => {
    const res = await server.app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })

  it('rechaza mutaciones con un origen no confiable', async () => {
    const res = await postProcedure(
      server.app,
      'auth.login',
      { email: 'a@example.com', password: 'lo-que-sea' },
      { origin: 'https://malicioso.example' },
    )

    expect(res.statusCode).toBe(403)
    expect(res.json()).toEqual({ error: 'origen_no_permitido' })
  })

  it('deja pasar un origen confiable', async () => {
    const origin = config.trustedOrigins[0] ?? 'http://localhost:8081'

    const res = await postProcedure(
      server.app,
      'auth.login',
      { email: 'no-es-un-email', password: 'lo-que-sea' },
      { origin },
    )

    expect(res.statusCode).not.toBe(403)
  })

  it('responde 404 sin detalles en rutas desconocidas', async () => {
    const res = await server.app.inject({ method: 'GET', url: '/api/auth/session' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: 'no_encontrado' })
  })

  it('añade cabeceras de seguridad a todas las respuestas', async () => {
    const res = await server.app.inject({ method: 'GET', url: '/health' })
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['referrer-policy']).toBe('no-referrer')
  })
})
