import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import type { Config } from './config/schema.js'
import { createTokenService } from './auth/access-token.js'
import { createThrottle } from './auth/throttle.js'
import { createAudit } from './audit/write.js'
import { createContextFactory, type Deps } from './trpc/context.js'
import { appRouter } from './trpc/router.js'

export interface AppDeps {
  auth: Deps['auth']
  pools: Deps['pools']
  config: Config
}

const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cross-origin-opener-policy': 'same-origin',
}

/**
 * Construye la app sin escuchar. Los tests la usan con `inject`.
 * La única superficie pública es `/trpc` más `/health`.
 */
export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: {
      level: deps.config.nodeEnv === 'test' ? 'warn' : 'info',
      redact: {
        paths: [
          'req.headers.cookie',
          'req.headers.authorization',
          'res.headers["set-cookie"]',
          '*.password',
          '*.token',
          '*.secret',
        ],
        censor: '[redactado]',
      },
    },
    trustProxy: true,
    bodyLimit: 32 * 1024,
    requestIdHeader: 'x-request-id',
  })

  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return

    const origin = req.headers.origin
    if (!origin) return

    if (!deps.config.trustedOrigins.includes(origin)) {
      return reply.code(403).send({ error: 'origen_no_permitido' })
    }
  })

  app.addHook('onSend', async (_req, reply, payload) => {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      reply.header(key, value)
    }
    return payload
  })

  app.get('/health', async (_req, reply) => {
    try {
      await deps.pools.app`SELECT 1`
      return { status: 'ok' }
    } catch {
      return reply.code(503).send({ status: 'degraded' })
    }
  })

  const services: Deps = {
    auth: deps.auth,
    pools: deps.pools,
    tokens: createTokenService(deps.config),
    throttle: createThrottle(deps.pools.auth),
    audit: createAudit(deps.pools.auth, app.log),
  }

  app.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: createContextFactory(services),
    },
  })

  app.setNotFoundHandler((_req, reply) => {
    return reply.code(404).send({ error: 'no_encontrado' })
  })

  app.setErrorHandler((error: FastifyError, req, reply) => {
    req.log.error({ err: error, requestId: req.id }, 'petición fallida')

    const status = error.statusCode ?? 500
    const clientError = status >= 400 && status < 500

    return reply.code(clientError ? status : 500).send({
      error: clientError ? 'solicitud_invalida' : 'error_interno',
    })
  })

  return app
}
