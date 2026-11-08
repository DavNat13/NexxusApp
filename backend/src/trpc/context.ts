import type { FastifyReply } from 'fastify'
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import type { Auth } from '../auth/better-auth.js'
import type { TokenService } from '../auth/access-token.js'
import { readBearer } from '../auth/access-token.js'
import type { ThrottleStore } from '../auth/throttle.js'
import type { AuditMeta } from '../audit/meta.js'
import { auditMeta } from '../audit/meta.js'
import type { AuditWriter } from '../audit/write.js'
import type { Pools } from '../db/pools.js'
import { copySetCookie } from '../http/cookies.js'
import { toWebHeaders } from '../http/web-headers.js'

export interface AuthSession {
  user: { id: string; email: string; name: string }
  session: { id: string; expiresAt: Date; createdAt?: Date }
}

export interface Deps {
  auth: Auth
  pools: Pools
  tokens: TokenService
  throttle: ThrottleStore
  audit: AuditWriter
  allowedEmails: Set<string>
  registrationOpen: boolean
  sessionAbsoluteMaxSeconds: number
}

export interface Context extends Deps {
  session: AuthSession | null
  userId: string | null
  tokenSource: 'bearer' | 'cookie' | null
  /** Una petición nativa nunca se autentica con cookie. */
  native: boolean
  requestId: string
  ip: string | null
  userAgent: string | null
  meta: AuditMeta
  headers: Headers
  reply: FastifyReply
}

/**
 * El `userId` del contexto sale de la sesión o del JWT verificado.
 * Un `Authorization` inválido no cae de vuelta a la cookie: deja la petición
 * sin identidad. En nativo la cookie se ignora por completo.
 */
export function createContextFactory(deps: Deps) {
  return async ({ req, res }: CreateFastifyContextOptions): Promise<Context> => {
    const native = req.headers['x-client-platform'] === 'native'
    const headers = toWebHeaders(req.headers)

    if (native) headers.delete('cookie')

    let session: AuthSession | null = null

    if (!native) {
      try {
        const result = await deps.auth.api.getSession({ headers, returnHeaders: true })
        copySetCookie(res, result.headers)
        session = result.response as AuthSession | null
      } catch {
        session = null
      }
    }

    const bearer = readBearer(req.headers.authorization)
    let bearerUserId: string | null = null

    if (bearer) {
      try {
        bearerUserId = (await deps.tokens.verify(bearer)).userId
      } catch {
        bearerUserId = null
      }
    }

    const meta = auditMeta(req)

    return {
      ...deps,
      session,
      userId: bearer ? bearerUserId : (session?.user.id ?? null),
      tokenSource: bearer ? (bearerUserId ? 'bearer' : null) : (session ? 'cookie' : null),
      native,
      requestId: req.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      meta,
      headers,
      reply: res,
    }
  }
}
