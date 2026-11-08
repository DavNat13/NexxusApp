import { APIError } from 'better-auth/api'
import { publicProcedure, router } from '../trpc.js'
import { toTRPCError } from '../errors.js'
import {
  RESET_REQUEST_POLICY,
  RESET_VERIFY_POLICY,
} from '../../auth/throttle.js'
import { findUserIdByEmail } from '../../auth/users.js'
import {
  requestPasswordResetInput,
  resetPasswordInput,
  type PasswordResetResult,
} from '@nexxus/shared'
import {
  OK,
  invalidCode,
  recoveryKeys,
  resetReason,
  tooManyAttempts,
} from './auth-recovery-support.js'

/**
 * Recuperación con código de 6 dígitos. La solicitud responde siempre igual:
 * exista la cuenta o no, y falle o no el correo.
 */
export const recoveryRouter = router({
  requestPasswordReset: publicProcedure
    .input(requestPasswordResetInput)
    .mutation(async ({ ctx, input }): Promise<PasswordResetResult> => {
      const keys = recoveryKeys(input.email, ctx.ip)
      const status = await ctx.throttle.check([keys.account, keys.ip])

      if (status.locked) {
        await ctx.audit.attempt(
          ctx.meta,
          keys.account,
          'password_reset_requested',
          'failure',
          'locked',
        )
        return OK
      }

      await ctx.throttle.failure(keys.account, RESET_REQUEST_POLICY)
      await ctx.throttle.failure(keys.ip, RESET_REQUEST_POLICY)

      try {
        await ctx.auth.api.requestPasswordResetEmailOTP({
          body: { email: input.email },
          headers: ctx.headers,
        })
        await ctx.audit.attempt(
          ctx.meta,
          keys.account,
          'password_reset_requested',
          'success',
        )
      } catch {
        await ctx.audit.attempt(
          ctx.meta,
          keys.account,
          'password_reset_requested',
          'failure',
          'rejected',
        )
      }

      return OK
    }),

  resetPassword: publicProcedure
    .input(resetPasswordInput)
    .mutation(async ({ ctx, input }): Promise<PasswordResetResult> => {
      const keys = recoveryKeys(input.email, ctx.ip)
      const status = await ctx.throttle.check([keys.account, keys.ip])

      if (status.locked) {
        await ctx.audit.attempt(
          ctx.meta,
          keys.account,
          'password_reset',
          'failure',
          'locked',
        )
        throw tooManyAttempts(status.retryAfterSeconds)
      }

      try {
        await ctx.auth.api.resetPasswordEmailOTP({
          body: { email: input.email, otp: input.code, password: input.password },
          headers: ctx.headers,
        })
      } catch (error) {
        if (error instanceof APIError && error.statusCode < 500) {
          await ctx.throttle.failure(keys.account, RESET_VERIFY_POLICY)
          await ctx.throttle.failure(keys.ip, RESET_VERIFY_POLICY)
          await ctx.audit.attempt(
            ctx.meta,
            keys.account,
            'password_reset',
            'failure',
            resetReason(error),
          )
          throw invalidCode()
        }

        throw toTRPCError(error, 'No se pudo cambiar la contraseña.')
      }

      const userId = await findUserIdByEmail(ctx.pools.auth, input.email)
      await ctx.throttle.reset([keys.account, keys.ip])

      if (userId) {
        await ctx.audit.event(ctx.meta, userId, 'password_reset', 'success')
      } else {
        await ctx.audit.attempt(
          ctx.meta,
          keys.account,
          'password_reset',
          'failure',
          'user_not_found',
        )
      }

      return OK
    }),
})
