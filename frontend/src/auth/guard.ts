import { useEffect } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { useSession } from './session'

/** Manda a login si no hay sesión y al entrenamiento si ya la hay. */
export function useAuthGuard(): void {
  const { user, loading } = useSession()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuth = segments[0] === '(auth)'
    if (!user && !inAuth) router.replace('/login')
    if (user && inAuth) router.replace('/training')
  }, [user, loading, segments, router])
}
