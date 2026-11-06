import { TRPCError } from '@trpc/server'
import type { AuthPayload, AuthUser } from '@nexxus/shared'
import type { Context } from '../context.js'
import { findSessionId } from '../../auth/sessions.js'
import { sha256 } from '../../auth/hash.js'

export { loginInput, registerInput } from '@nexxus/shared'

function publicUser(user: AuthUser): AuthUser {
  return { id: user.id, email: user.email, name: user.name }
}

export function authPayload(
  user: AuthUser,
  access: { token: string; expiresAt: number; tokenType: 'Bearer' },
): AuthPayload {
  return {
    user: publicUser(user),
    accessToken: access.token,
    expiresAt: access.expiresAt,
    tokenType: access.tokenType,
  }
}

export function internal(message: string): TRPCError {
  return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message })
}

export async function issueAccessToken(
  ctx: Context,
  userId: string,
  sessionToken: string,
) {
  const sessionId = await findSessionId(ctx.pools.auth, sessionToken)
  if (!sessionId) throw internal('No se pudo abrir la sesión.')

  return ctx.tokens.sign(userId, sessionId)
}

export function loginKeys(address: string, ip: string | null) {
  return {
    account: sha256(`account:${address}`),
    ip: sha256(`ip:${ip ?? 'desconocida'}`),
  }
}
