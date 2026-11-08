import { TRPCError } from '@trpc/server'
import type { PasswordResetResult } from '@nexxus/shared'
import { sha256 } from '../../auth/hash.js'

export const OK: PasswordResetResult = { ok: true }

export function recoveryKeys(email: string, ip: string | null) {
  return {
    account: sha256(`reset-account:${email}`),
    ip: sha256(`reset-ip:${ip ?? 'desconocida'}`),
  }
}

export function invalidCode(): TRPCError {
  return new TRPCError({
    code: 'BAD_REQUEST',
    message: 'El código no es válido o ha caducado.',
  })
}

export function tooManyAttempts(seconds: number): TRPCError {
  return new TRPCError({
    code: 'TOO_MANY_REQUESTS',
    message: `Demasiados intentos. Reintenta en ${seconds} s.`,
  })
}

/** Motivo real para la auditoría; nunca se envía al cliente. */
export function resetReason(error: unknown): string {
  const body = (error as { body?: { code?: unknown } }).body
  const code = typeof body?.code === 'string' ? body.code : ''

  if (code === 'OTP_EXPIRED') return 'expired'
  if (code === 'TOO_MANY_ATTEMPTS') return 'too_many_attempts'
  if (code === 'INVALID_OTP') return 'invalid_code'
  return 'rejected'
}
