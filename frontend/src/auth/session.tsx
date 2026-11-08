import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthPayload, LoginInput, RegisterInput } from '@nexxus/shared'
import { trpc } from '../api/trpc'
import { setAccessToken } from '../api/token'
import { isNative } from '../api/platform'
import { invalidateRefresh, refreshSession } from './refresh-session'
import { clearCachedUser, readCachedUser, writeCachedUser } from './session-cache'
import { clearRefreshToken, readRefreshToken, writeRefreshToken } from './token-store'
import {
  initialSessionState,
  reduceRefresh,
  type SessionState,
} from './session-state'

interface SessionValue extends SessionState {
  loading: boolean
  signIn: (input: LoginInput) => Promise<void>
  signUp: (input: RegisterInput) => Promise<void>
  signOut: () => Promise<void>
  /** Limpia token, pista y caché sin llamar a la API (sesión ya revocada). */
  clearLocalSession: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    status: 'checking',
    user: null,
  })

  const login = trpc.auth.login.useMutation()
  const register = trpc.auth.register.useMutation()
  const logout = trpc.auth.logout.useMutation()

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const cached = await readCachedUser()
      if (cancelled) return

      const base = initialSessionState(cached)
      setState(base)

      const outcome = await refreshSession()
      if (cancelled) return

      if (outcome.status === 'refreshed') await writeCachedUser(outcome.user)
      if (outcome.status === 'rejected') await clearCachedUser()

      if (!cancelled) setState(reduceRefresh(base, outcome))
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  async function adopt(data: AuthPayload): Promise<void> {
    setAccessToken(data.accessToken)

    if (isNative) {
      if (!data.refreshToken) {
        setAccessToken(null)
        throw new Error('No se pudo guardar la sesión en el dispositivo.')
      }
      await writeRefreshToken(data.refreshToken)
    }

    await writeCachedUser(data.user)
    setState({ status: 'authenticated', user: data.user })
  }

  async function signIn(input: LoginInput): Promise<void> {
    invalidateRefresh()
    setAccessToken(null)
    await adopt(await login.mutateAsync(input))
  }

  async function signUp(input: RegisterInput): Promise<void> {
    invalidateRefresh()
    setAccessToken(null)
    await adopt(await register.mutateAsync(input))
  }

  async function clearLocalSession(): Promise<void> {
    invalidateRefresh()
    setAccessToken(null)
    setState({ status: 'anonymous', user: null })

    try {
      await Promise.all([clearRefreshToken(), clearCachedUser()])
    } catch {
      // La sesión remota ya está revocada; el almacenamiento se reintenta al arrancar.
    }
  }

  async function signOut(): Promise<void> {
    const refreshToken = await readRefreshToken()
    await clearLocalSession()

    try {
      await logout.mutateAsync(isNative && refreshToken ? { refreshToken } : {})
    } catch {
      // La sesión local ya está cerrada; la remota caducará por expiración.
    }
  }

  return (
    <SessionContext.Provider
      value={{
        ...state,
        loading: state.status === 'checking',
        signIn,
        signUp,
        signOut,
        clearLocalSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession debe usarse dentro de SessionProvider')

  return value
}
