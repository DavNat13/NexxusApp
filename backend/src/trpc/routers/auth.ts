import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { protectedProcedure, publicProcedure, router } from '../trpc.js'
import { toTRPCError } from '../errors.js'
import { copySetCookie } from '../../http/cookies.js'

const email = z.string().trim().toLowerCase().min(3).max(254).pipe(z.email())
const password = z.string().min(12).max(128)
const newName = z.string().trim().min(2).max(80)

const registerInput = z.object({ name: newName, email, password })
const loginInput = z.object({ email, password: z.string().min(1).max(128) })

interface PublicUser {
  id: string
  email: string
  name: string
}

function publicUser(user: { id: string; email: string; name: string }): PublicUser {
  return { id: user.id, email: user.email, name: user.name }
}

export const authRouter = router({
  register: publicProcedure.input(registerInput).mutation(async ({ ctx, input }) => {
    try {
      const { headers, response } = await ctx.auth.api.signUpEmail({
        body: { name: input.name, email: input.email, password: input.password },
        headers: ctx.headers,
        returnHeaders: true,
      })

      copySetCookie(ctx.reply, headers)
      return { user: publicUser(response.user) }
    } catch (error) {
      throw toTRPCError(error, 'No se pudo crear la cuenta.')
    }
  }),

  login: publicProcedure.input(loginInput).mutation(async ({ ctx, input }) => {
    try {
      const { headers, response } = await ctx.auth.api.signInEmail({
        body: { email: input.email, password: input.password, rememberMe: true },
        headers: ctx.headers,
        returnHeaders: true,
      })

      copySetCookie(ctx.reply, headers)
      return { user: publicUser(response.user) }
    } catch (error) {
      throw toTRPCError(error, 'Credenciales inválidas.', 'Credenciales inválidas.')
    }
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session) {
      return { ok: true }
    }

    try {
      const { headers } = await ctx.auth.api.signOut({
        headers: ctx.headers,
        returnHeaders: true,
      })

      copySetCookie(ctx.reply, headers)
      return { ok: true }
    } catch (error) {
      throw toTRPCError(error, 'No se pudo cerrar la sesión.')
    }
  }),

  refresh: publicProcedure.mutation(({ ctx }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sesión no válida.' })
    }

    return { user: publicUser(ctx.session.user) }
  }),

  me: protectedProcedure.query(({ ctx }) => {
    return { user: publicUser(ctx.session.user) }
  }),
})
