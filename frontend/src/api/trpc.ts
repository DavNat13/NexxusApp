import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../../../backend/src/trpc/router.js'

export const trpc = createTRPCReact<AppRouter>()
