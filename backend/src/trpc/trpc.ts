import { initTRPC, TRPCError } from '@trpc/server'
import type { Context } from './context.js'

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: error.code === 'INTERNAL_SERVER_ERROR' ? 'Error interno' : shape.message,
      data: { ...shape.data, stack: undefined },
    }
  },
})

export const router = t.router
export const middleware = t.middleware

export const publicProcedure = t.procedure

/**
 * Exige sesión verificada. El `userId` que ve el procedimiento procede de la
 * sesión, nunca del input.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sesión no válida.' })
  }

  return next({
    ctx: { ...ctx, session: ctx.session, userId: ctx.session.user.id },
  })
})
