import { createTRPCClient, httpLink, TRPCClientError } from '@trpc/client'
import type { AppRouter } from '../../../backend/src/trpc/router.js'
import { API_URL } from '../config'
import { setAccessToken } from '../api/token'
import { isNative, platformHeaders, requestCredentials } from '../api/platform'
import {
  createRefreshController,
  type RefreshRequestResult,
} from './refresh-controller'
import { clearRefreshToken, readRefreshToken, writeRefreshToken } from './token-store'

const refreshClient = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: `${API_URL}/trpc`,
      headers: platformHeaders,
      fetch(input, init) {
        return fetch(input, { ...init, credentials: requestCredentials })
      },
    }),
  ],
})

/** Traduce los errores del transporte a los tres resultados del controlador. */
async function request(refreshToken: string | null): Promise<RefreshRequestResult> {
  try {
    const data = await refreshClient.auth.refresh.mutate(
      refreshToken ? { refreshToken } : {},
    )

    return {
      kind: 'ok',
      accessToken: data.accessToken,
      user: data.user,
      refreshToken: data.refreshToken,
    }
  } catch (error) {
    if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
      return { kind: 'rejected' }
    }

    return { kind: 'offline' }
  }
}

const controller = createRefreshController({
  isNative,
  request,
  readToken: readRefreshToken,
  writeToken: writeRefreshToken,
  clearToken: clearRefreshToken,
  setAccessToken,
})

export const refreshSession = controller.run
export const invalidateRefresh = controller.invalidate
