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
export const mergeRouters = t.mergeRouters
export const middleware = t.middleware

export const publicProcedure = t.procedure

/**
 * Exige identidad verificada: cookie de sesión o JWT firmado.
 * El `userId` que ve el procedimiento nunca procede del input.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sesión no válida.' })
  }

  return next({ ctx: { ...ctx, userId: ctx.userId } })
})
