import { mergeRouters } from '../trpc.js'
import { passwordRouter } from './auth-password.js'
import { recoveryRouter } from './auth-recovery.js'
import { sessionRouter } from './auth-session.js'

export const authRouter = mergeRouters(
  passwordRouter,
  sessionRouter,
  recoveryRouter,
)
