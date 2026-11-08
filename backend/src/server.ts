import { buildApp } from './app.js'
import { config } from './config/env.js'
import { createPools } from './db/pools.js'
import { verifyPrivileges } from './db/verify.js'

const pools = createPools(config)
const app = buildApp({ pools, config })

if (config.registrationOpen) {
  app.log.warn('ALLOWED_EMAILS vacía: registro abierto; no usar así en producción')
}

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, 'cerrando la API')
  await app.close()
  await pools.close()
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal).then(() => process.exit(0))
  })
}

try {
  await verifyPrivileges(pools)
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  app.log.error({ err: error }, 'no se pudo arrancar la API')
  await pools.close()
  process.exit(1)
}
