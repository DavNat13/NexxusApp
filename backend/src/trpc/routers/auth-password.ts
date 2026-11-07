import { TRPCError } from '@trpc/server'
import { APIError } from 'better-auth/api'
import { publicProcedure, router } from '../trpc.js'
import { toTRPCError } from '../errors.js'
import { copySetCookie } from '../../http/cookies.js'
import { sha256 } from '../../auth/hash.js'
import { ACCOUNT_POLICY, IP_POLICY } from '../../auth/throttle.js'
import {
  authPayload,
  internal,
  issueAccessToken,
  loginInput,
  loginKeys,
  refreshTokenFrom,
  registerInput,
} from './auth-support.js'

/**
 * Registro y login. En web la sesión viaja en cookie `httpOnly`; en nativo la
 * respuesta incluye el refresh firmado y nunca se emite `Set-Cookie`.
 */
export const passwordRouter = router({
  register: publicProcedure.input(registerInput).mutation(async ({ ctx, input }) => {
    const account = sha256(`account:${input.email}`)

    try {
      const { headers, response } = await ctx.auth.api.signUpEmail({
        body: { name: input.name, email: input.email, password: input.password },
        headers: ctx.headers,
        returnHeaders: true,
      })

      if (!response.token) throw internal('No se pudo abrir la sesión.')

      const refreshToken = ctx.native ? refreshTokenFrom(headers) : null
      if (ctx.native && !refreshToken) throw internal('No se pudo abrir la sesión.')

      const access = await issueAccessToken(ctx, response.user.id, response.token)
      await ctx.audit.event(ctx.meta, response.user.id, 'register', 'success')
      if (!ctx.native) copySetCookie(ctx.reply, headers)

      return authPayload(response.user, access, refreshToken ?? undefined)
    } catch (error) {
      if (error instanceof TRPCError) throw error
      if (error instanceof APIError && error.statusCode < 500) {
        await ctx.audit.attempt(ctx.meta, account, 'register', 'failure', 'rejected')
      }
      throw toTRPCError(error, 'No se pudo crear la cuenta.')
    }
  }),

  login: publicProcedure.input(loginInput).mutation(async ({ ctx, input }) => {
    const keys = loginKeys(input.email, ctx.ip)
    const status = await ctx.throttle.check([keys.account, keys.ip])

    if (status.locked) {
      await ctx.audit.attempt(ctx.meta, keys.account, 'login', 'failure', 'locked')
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Demasiados intentos. Reintenta en ${status.retryAfterSeconds} s.`,
      })
    }

    try {
      const { headers, response } = await ctx.auth.api.signInEmail({
        body: { email: input.email, password: input.password, rememberMe: true },
        headers: ctx.headers,
        returnHeaders: true,
      })

      if (!response.token) throw internal('No se pudo abrir la sesión.')

      const refreshToken = ctx.native ? refreshTokenFrom(headers) : null
      if (ctx.native && !refreshToken) throw internal('No se pudo abrir la sesión.')

      const access = await issueAccessToken(ctx, response.user.id, response.token)
      await ctx.throttle.reset([keys.account, keys.ip])
      await ctx.audit.event(ctx.meta, response.user.id, 'login', 'success')
      if (!ctx.native) copySetCookie(ctx.reply, headers)

      return authPayload(response.user, access, refreshToken ?? undefined)
    } catch (error) {
      if (error instanceof TRPCError) throw error

      if (error instanceof APIError && error.statusCode < 500) {
        await ctx.throttle.failure(keys.account, ACCOUNT_POLICY)
        await ctx.throttle.failure(keys.ip, IP_POLICY)
        await ctx.audit.attempt(ctx.meta, keys.account, 'login', 'failure', 'invalid_credentials')
      }

      throw toTRPCError(error, 'Credenciales inválidas.', 'Credenciales inválidas.')
    }
  }),
})
