import { describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@nexxus/shared'
import {
  createRefreshController,
  type RefreshDeps,
  type RefreshPayload,
  type RefreshRequestResult,
} from './refresh-controller'

const user: AuthUser = { id: 'user-1', email: 'ana@example.com', name: 'Ana' }
const payload: RefreshPayload = {
  accessToken: 'access-nuevo',
  user,
  refreshToken: 'refresh-nuevo',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })

  return { promise, resolve }
}

function deps(overrides: Partial<RefreshDeps> = {}): RefreshDeps {
  return {
    isNative: true,
    request: vi.fn(
      async (): Promise<RefreshRequestResult> => ({ kind: 'ok', ...payload }),
    ),
    readToken: vi.fn(async () => 'refresh-viejo'),
    writeToken: vi.fn(async () => undefined),
    clearToken: vi.fn(async () => undefined),
    setAccessToken: vi.fn(),
    ...overrides,
  }
}

describe('controlador de refresco', () => {
  it('una sola petición en vuelo aunque se llame dos veces', async () => {
    const pending = deferred<RefreshRequestResult>()
    const request = vi.fn((): Promise<RefreshRequestResult> => pending.promise)
    const controller = createRefreshController(deps({ request }))

    const first = controller.run()
    const second = controller.run()

    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    pending.resolve({ kind: 'ok', ...payload })

    await expect(first).resolves.toMatchObject({ status: 'refreshed' })
    await expect(second).resolves.toMatchObject({ status: 'refreshed' })
  })

  it('refreshed aplica el access token y guarda el nuevo refresh', async () => {
    const d = deps()
    const controller = createRefreshController(d)

    const result = await controller.run()

    expect(result).toEqual({ status: 'refreshed', user })
    expect(d.setAccessToken).toHaveBeenCalledWith('access-nuevo')
    expect(d.writeToken).toHaveBeenCalledWith('refresh-nuevo')
  })

  it('rechazado limpia el refresh y el access token', async () => {
    const d = deps({
      request: vi.fn(async (): Promise<RefreshRequestResult> => ({ kind: 'rejected' })),
    })
    const controller = createRefreshController(d)

    const result = await controller.run()

    expect(result).toEqual({ status: 'rejected' })
    expect(d.clearToken).toHaveBeenCalledOnce()
    expect(d.setAccessToken).toHaveBeenCalledWith(null)
    expect(d.writeToken).not.toHaveBeenCalled()
  })

  it('offline conserva el token y la sesión local', async () => {
    const d = deps({
      request: vi.fn(async (): Promise<RefreshRequestResult> => ({ kind: 'offline' })),
    })
    const controller = createRefreshController(d)

    const result = await controller.run()

    expect(result).toEqual({ status: 'offline' })
    expect(d.clearToken).not.toHaveBeenCalled()
    expect(d.setAccessToken).not.toHaveBeenCalled()
    expect(d.writeToken).not.toHaveBeenCalled()
  })

  it('un refresh que termina tras invalidate no restaura la sesión', async () => {
    const pending = deferred<RefreshRequestResult>()
    const d = deps({ request: vi.fn((): Promise<RefreshRequestResult> => pending.promise) })
    const controller = createRefreshController(d)

    const running = controller.run()
    controller.invalidate()
    pending.resolve({ kind: 'ok', ...payload })

    await expect(running).resolves.toEqual({ status: 'rejected' })
    expect(d.setAccessToken).not.toHaveBeenCalled()
    expect(d.writeToken).not.toHaveBeenCalled()
  })

  it('en nativo sin token no llama a la red', async () => {
    const d = deps({ readToken: vi.fn(async () => null) })
    const controller = createRefreshController(d)

    const result = await controller.run()

    expect(result).toEqual({ status: 'rejected' })
    expect(d.request).not.toHaveBeenCalled()
    expect(d.setAccessToken).toHaveBeenCalledWith(null)
  })
})
