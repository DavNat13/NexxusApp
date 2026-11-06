import { createTRPCClient, httpLink } from '@trpc/client'
import type { AppRouter } from '../../../backend/src/trpc/router.js'
import { API_URL } from '../config'
import { getAccessToken, setAccessToken } from './token'

const url = `${API_URL}/trpc`

function withCredentials(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, credentials: 'include' })
}

/** El refresco no pasa por authFetch: evita un bucle si la cookie también falla. */
const refreshClient = createTRPCClient<AppRouter>({
  links: [httpLink({ url, fetch: withCredentials })],
})

let inFlight: Promise<boolean> | null = null

/** Una sola petición de refresco en vuelo, aunque fallen diez llamadas a la vez. */
function refreshOnce(): Promise<boolean> {
  inFlight ??= refreshClient.auth.refresh
    .mutate()
    .then((data) => {
      setAccessToken(data.accessToken)
      return true
    })
    .catch(() => {
      setAccessToken(null)
      return false
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

function withAuth(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers)
  const token = getAccessToken()
  if (token) headers.set('authorization', `Bearer ${token}`)

  return { ...init, headers, credentials: 'include' }
}

/**
 * Ante un 401 renueva el access token con la cookie de refresco y reintenta
 * una sola vez. Si el refresco falla, devuelve el 401 original.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, withAuth(init))
  if (response.status !== 401) return response
  if (!(await refreshOnce())) return response

  return fetch(input, withAuth(init))
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpLink({ url, fetch: authFetch })],
})

export { refreshOnce }
