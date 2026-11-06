import { createContext, useContext, useEffect, type ReactNode } from 'react'
import type { AuthUser, LoginInput, RegisterInput } from '@nexxus/shared'
import { trpc } from '../api/trpc'
import { getAccessToken, setAccessToken } from '../api/token'

interface SessionValue {
  user: AuthUser | null
  loading: boolean
  signIn: (input: LoginInput) => Promise<void>
  signUp: (input: RegisterInput) => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils()

  const me = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  })

  const refresh = trpc.auth.refresh.useMutation({
    onSuccess(data) {
      setAccessToken(data.accessToken)
      utils.auth.me.setData(undefined, { user: data.user })
    },
  })

  const login = trpc.auth.login.useMutation()
  const register = trpc.auth.register.useMutation()
  const logout = trpc.auth.logout.useMutation()

  // Al abrir la app no hay token en memoria: se pide uno nuevo con la cookie.
  // Se ejecuta una sola vez, al montar.
  useEffect(() => {
    if (!getAccessToken()) refresh.mutate()
  }, [])

  async function signIn(input: LoginInput): Promise<void> {
    const data = await login.mutateAsync(input)
    setAccessToken(data.accessToken)
    utils.auth.me.setData(undefined, { user: data.user })
  }

  async function signUp(input: RegisterInput): Promise<void> {
    const data = await register.mutateAsync(input)
    setAccessToken(data.accessToken)
    utils.auth.me.setData(undefined, { user: data.user })
  }

  async function signOut(): Promise<void> {
    try {
      await logout.mutateAsync()
    } finally {
      setAccessToken(null)
      utils.auth.me.setData(undefined, undefined)
    }
  }

  return (
    <SessionContext.Provider
      value={{ user: me.data?.user ?? null, loading: me.isPending, signIn, signUp, signOut }}
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
