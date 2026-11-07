import type { AuthUser } from '@nexxus/shared'

export type SessionStatus = 'checking' | 'authenticated' | 'anonymous'

export interface SessionState {
  status: SessionStatus
  user: AuthUser | null
}

export type RefreshOutcome =
  | { status: 'refreshed'; user: AuthUser }
  | { status: 'rejected' }
  | { status: 'offline' }

/**
 * Con usuario cacheado se abre la app de inmediato, incluso sin red.
 * Sin caché hay que esperar al refresco antes de decidir.
 */
export function initialSessionState(cachedUser: AuthUser | null): SessionState {
  if (cachedUser) return { status: 'authenticated', user: cachedUser }

  return { status: 'checking', user: null }
}

export function reduceRefresh(
  state: SessionState,
  outcome: RefreshOutcome,
): SessionState {
  switch (outcome.status) {
    case 'refreshed':
      return { status: 'authenticated', user: outcome.user }
    case 'rejected':
      return { status: 'anonymous', user: null }
    case 'offline':
      // Un fallo de red no es un logout: se conserva al usuario cacheado.
      return state.user ? state : { status: 'anonymous', user: null }
  }
}
