import { createTRPCClient, httpLink } from '@trpc/client'
import type { AppRouter } from '../../../backend/src/trpc/router.js'
import { API_URL } from '../config'
import { getAccessToken } from './token'
import { platformHeaders, requestCredentials } from './platform'
import { refreshSession } from '../auth/refresh-session'

const url = `${API_URL}/trpc`

function withAuth(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers)
  const token = getAccessToken()
  if (token) headers.set('authorization', `Bearer ${token}`)
  for (const [key, value] of Object.entries(platformHeaders())) headers.set(key, value)

  return { ...init, headers, credentials: requestCredentials }
}

/**
 * Ante un 401 renueva el access token y reintenta una sola vez.
 * Si el refresco se rechaza o no hay red, devuelve el 401 original.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, withAuth(init))
  if (response.status !== 401) return response

  const outcome = await refreshSession()
  if (outcome.status !== 'refreshed') return response

  return fetch(input, withAuth(init))
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpLink({ url, fetch: authFetch })],
})
