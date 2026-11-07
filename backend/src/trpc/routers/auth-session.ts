import { protectedProcedure, publicProcedure, router } from '../trpc.js'
import { toTRPCError } from '../errors.js'
import { copySetCookie } from '../../http/cookies.js'
import { findUser } from '../../auth/users.js'
import {
  authPayload,
  bearerHeaders,
  logoutInput,
  refreshInput,
  sessionFromRefreshToken,
  unauthorized,
} from './auth-support.js'

/** Refresco, cierre de sesión y datos de la sesión actual. */
export const sessionRouter = router({
  logout: publicProcedure.input(logoutInput).mutation(async ({ ctx, input }) => {
    if (ctx.native) {
      if (!input.refreshToken) return { ok: true }

      const session = await sessionFromRefreshToken(ctx, input.refreshToken).catch(
        () => null,
      )

      if (!session) return { ok: true }

      try {
        await ctx.auth.api.signOut({
          headers: bearerHeaders(input.refreshToken),
          returnHeaders: true,
        })
        await ctx.audit.event(ctx.meta, session.user.id, 'logout', 'success')
        return { ok: true }
      } catch (error) {
        throw toTRPCError(error, 'No se pudo cerrar la sesión.')
      }
    }

    if (!ctx.session) return { ok: true }

    try {
      const { headers } = await ctx.auth.api.signOut({
        headers: ctx.headers,
        returnHeaders: true,
      })

      await ctx.audit.event(ctx.meta, ctx.session.user.id, 'logout', 'success')
      copySetCookie(ctx.reply, headers)
      return { ok: true }
    } catch (error) {
      throw toTRPCError(error, 'No se pudo cerrar la sesión.')
    }
  }),

  refresh: publicProcedure.input(refreshInput).mutation(async ({ ctx, input }) => {
    let session
    let refreshToken: string | undefined

    if (ctx.native) {
      if (!input.refreshToken) throw unauthorized()

      session = await sessionFromRefreshToken(ctx, input.refreshToken)
      refreshToken = input.refreshToken
    } else {
      if (!ctx.session) throw unauthorized()
      session = ctx.session
    }

    const access = await ctx.tokens.sign(session.user.id, session.session.id)
    await ctx.audit.event(ctx.meta, session.user.id, 'refresh', 'success')

    return authPayload(session.user, access, refreshToken)
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await findUser(ctx.pools.auth, ctx.userId)

    if (!user) throw unauthorized()

    return { user }
  }),
})
