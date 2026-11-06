import { TRPCError } from '@trpc/server'
import { APIError } from 'better-auth/api'

/**
 * Traduce errores de Better Auth a errores de tRPC con mensajes fijos.
 * No se reenvía el mensaje original: puede revelar si un email existe.
 */
export function toTRPCError(
  error: unknown,
  fallback: string,
  unauthorized = 'Sesión no válida.',
): TRPCError {
  if (!(error instanceof APIError)) {
    return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error interno' })
  }

  if (error.statusCode === 429) {
    return new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiados intentos. Inténtalo más tarde.',
    })
  }

  if (error.statusCode === 403) {
    return new TRPCError({ code: 'FORBIDDEN', message: 'Origen no permitido.' })
  }

  if (error.statusCode === 401) {
    return new TRPCError({ code: 'UNAUTHORIZED', message: unauthorized })
  }

  if (error.statusCode >= 500) {
    return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error interno' })
  }

  return new TRPCError({ code: 'BAD_REQUEST', message: fallback })
}
