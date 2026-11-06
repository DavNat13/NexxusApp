import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import type { Context } from '../context.js'
import { findSessionId } from '../../auth/sessions.js'
import { sha256 } from '../../auth/hash.js'

const email = z.string().trim().toLowerCase().min(3).max(254).pipe(z.email())
const password = z.string().min(12).max(128)
const newName = z.string().trim().min(2).max(80)

export const registerInput = z.object({ name: newName, email, password })
export const loginInput = z.object({ email, password: z.string().min(1).max(128) })

function publicUser(user: { id: string; email: string; name: string }) {
  return { id: user.id, email: user.email, name: user.name }
}

export function authPayload(
  user: { id: string; email: string; name: string },
  access: { token: string; expiresAt: number; tokenType: 'Bearer' },
) {
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
