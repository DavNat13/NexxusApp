import { describe, expect, it } from 'vitest'
import type { AuthUser } from '@nexxus/shared'
import { initialSessionState, reduceRefresh } from './session-state'

const cached: AuthUser = {
  id: 'user-1',
  email: 'ana@example.com',
  name: 'Ana',
}

const other: AuthUser = {
  id: 'user-2',
  email: 'leo@example.com',
  name: 'Leo',
}

describe('estado inicial', () => {
  it('sin caché espera al refresco', () => {
    expect(initialSessionState(null)).toEqual({ status: 'checking', user: null })
  })

  it('con usuario cacheado abre la app sin esperar a la red', () => {
    expect(initialSessionState(cached)).toEqual({
      status: 'authenticated',
      user: cached,
    })
  })
})

describe('resultado del refresco', () => {
  it('refreshed autentica con el usuario del servidor', () => {
    const state = reduceRefresh({ status: 'checking', user: null }, {
      status: 'refreshed',
      user: other,
    })

    expect(state).toEqual({ status: 'authenticated', user: other })
  })

  it('rejected cierra la sesión aunque hubiera caché', () => {
    const state = reduceRefresh({ status: 'authenticated', user: cached }, {
      status: 'rejected',
    })

    expect(state).toEqual({ status: 'anonymous', user: null })
  })

  it('offline conserva al usuario cacheado', () => {
    const state = reduceRefresh({ status: 'authenticated', user: cached }, {
      status: 'offline',
    })

    expect(state).toEqual({ status: 'authenticated', user: cached })
  })

  it('offline sin caché no inventa una sesión', () => {
    const state = reduceRefresh({ status: 'checking', user: null }, {
      status: 'offline',
    })

    expect(state).toEqual({ status: 'anonymous', user: null })
  })
})
