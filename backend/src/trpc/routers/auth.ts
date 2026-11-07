import { mergeRouters } from '../trpc.js'
import { passwordRouter } from './auth-password.js'
import { sessionRouter } from './auth-session.js'

export const authRouter = mergeRouters(passwordRouter, sessionRouter)
