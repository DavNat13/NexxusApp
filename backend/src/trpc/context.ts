import type { FastifyReply } from 'fastify'
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import type { Auth } from '../auth/better-auth.js'
import type { Pools } from '../db/pools.js'
import { copySetCookie } from '../http/cookies.js'
import { toWebHeaders } from '../http/web-headers.js'

export interface AuthSession {
  user: { id: string; email: string; name: string }
  session: { id: string; expiresAt: Date }
}

export interface Deps {
  auth: Auth
  pools: Pools
}

export interface Context {
  auth: Auth
  pools: Pools
  session: AuthSession | null
  userId: string | null
  requestId: string
  headers: Headers
  reply: FastifyReply
}

/**
 * El `userId` del contexto sale siempre de la sesión verificada.
 * Lo que envíe el cliente en el input se ignora.
 */
export function createContextFactory(deps: Deps) {
  return async ({ req, res }: CreateFastifyContextOptions): Promise<Context> => {
    const headers = toWebHeaders(req.headers)
    let session: AuthSession | null

    try {
      const result = await deps.auth.api.getSession({ headers, returnHeaders: true })
      copySetCookie(res, result.headers)
      session = result.response as AuthSession | null
    } catch {
      session = null
    }

    return {
      auth: deps.auth,
      pools: deps.pools,
      session,
      userId: session?.user.id ?? null,
      requestId: req.id,
      headers,
      reply: res,
    }
  }
}
