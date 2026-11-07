import { TRPCError } from '@trpc/server'
import { parseSetCookieHeader } from 'better-auth/cookies'
import type { AuthPayload, AuthUser } from '@nexxus/shared'
import type { AuthSession, Context } from '../context.js'
import { findSessionId } from '../../auth/sessions.js'
import { sha256 } from '../../auth/hash.js'

export { loginInput, logoutInput, refreshInput, registerInput } from '@nexxus/shared'

function publicUser(user: AuthUser): AuthUser {
  return { id: user.id, email: user.email, name: user.name }
}

export function authPayload(
  user: AuthUser,
  access: { token: string; expiresAt: number; tokenType: 'Bearer' },
  refreshToken?: string,
): AuthPayload {
  const payload: AuthPayload = {
    user: publicUser(user),
    accessToken: access.token,
    expiresAt: access.expiresAt,
    tokenType: access.tokenType,
  }

  if (refreshToken) payload.refreshToken = refreshToken

  return payload
}

export function internal(message: string): TRPCError {
  return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message })
}

export function unauthorized(): TRPCError {
  return new TRPCError({ code: 'UNAUTHORIZED', message: 'Sesión no válida.' })
}

/** Mismo mensaje para correo existente, no permitido o fallo interno. */
export function registrationFailed(): TRPCError {
  return new TRPCError({ code: 'BAD_REQUEST', message: 'No se pudo crear la cuenta.' })
}

/** Cabeceras para presentar el refresh nativo como sesión de Better Auth. */
export function bearerHeaders(token: string): Headers {
  return new Headers({ authorization: `Bearer ${token}` })
}

/**
 * Recupera el token firmado que Better Auth deja en `set-auth-token`.
 * Si el plugin no lo expone, se lee la cookie de sesión de la respuesta.
 */
export function refreshTokenFrom(headers: Headers): string | null {
  const direct = headers.get('set-auth-token')
  if (direct) return direct

  const cookies = parseSetCookieHeader(headers.get('set-cookie') ?? '')

  for (const [name, attributes] of cookies) {
    if (!name.endsWith('session_token')) continue
    if (attributes.value) return attributes.value
  }

  return null
}

/** Valida un refresh nativo contra Better Auth sin usar cookies. */
export async function sessionFromRefreshToken(
  ctx: Context,
  token: string,
): Promise<AuthSession> {
  let session: AuthSession | null

  try {
    const result = await ctx.auth.api.getSession({
      headers: bearerHeaders(token),
      returnHeaders: true,
    })
    session = result.response as AuthSession | null
  } catch {
    session = null
  }

  if (!session) throw unauthorized()

  return session
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
