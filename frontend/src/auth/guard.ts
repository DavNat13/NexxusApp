import { useEffect } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { useSession } from './session'

/**
 * Solo `anonymous` manda a login. Con `checking` no se navega y, si el
 * refresco falla por red, se conserva la sesión cacheada.
 */
export function useAuthGuard(): void {
  const { status } = useSession()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (status === 'checking') return

    const inAuth = segments[0] === '(auth)'
    if (status === 'anonymous' && !inAuth) router.replace('/login')
    if (status === 'authenticated' && inAuth) router.replace('/training')
  }, [status, segments, router])
}
