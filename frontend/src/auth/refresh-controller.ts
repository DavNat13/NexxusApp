import type { AuthUser } from '@nexxus/shared'
import type { RefreshOutcome } from './session-state'

export interface RefreshPayload {
  accessToken: string
  user: AuthUser
  refreshToken?: string
}

/**
 * Resultado normalizado de la petición de refresco.
 * El transporte traduce sus errores a `rejected` u `offline`.
 */
export type RefreshRequestResult =
  | ({ kind: 'ok' } & RefreshPayload)
  | { kind: 'rejected' }
  | { kind: 'offline' }

export interface RefreshDeps {
  isNative: boolean
  request: (refreshToken: string | null) => Promise<RefreshRequestResult>
  readToken: () => Promise<string | null>
  writeToken: (token: string) => Promise<void>
  clearToken: () => Promise<void>
  setAccessToken: (token: string | null) => void
}

export interface RefreshController {
  run: () => Promise<RefreshOutcome>
  invalidate: () => void
}

/**
 * Controlador puro de refresco: sin React, sin tRPC y sin almacenes concretos.
 * Una sola petición en vuelo y una época que descarta resultados posteriores
 * a un logout.
 */
export function createRefreshController(deps: RefreshDeps): RefreshController {
  let epoch = 0
  let inFlight: Promise<RefreshOutcome> | null = null

  async function execute(): Promise<RefreshOutcome> {
    const startEpoch = epoch
    const token = deps.isNative ? await deps.readToken() : null

    if (deps.isNative && !token) {
      if (epoch === startEpoch) deps.setAccessToken(null)
      return { status: 'rejected' }
    }

    const result = await deps.request(token)

    if (epoch !== startEpoch) return { status: 'rejected' }
    if (result.kind === 'offline') return { status: 'offline' }

    if (result.kind === 'rejected') {
      deps.setAccessToken(null)
      await deps.clearToken()
      return { status: 'rejected' }
    }

    deps.setAccessToken(result.accessToken)
    if (result.refreshToken) await deps.writeToken(result.refreshToken)

    return { status: 'refreshed', user: result.user }
  }

  function run(): Promise<RefreshOutcome> {
    if (inFlight) return inFlight

    const promise = execute().finally(() => {
      if (inFlight === promise) inFlight = null
    })

    inFlight = promise
    return promise
  }

  function invalidate(): void {
    epoch += 1
    inFlight = null
  }

  return { run, invalidate }
}
