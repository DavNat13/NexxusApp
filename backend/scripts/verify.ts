import { config } from '../src/config/env.js'
import { createAuth } from '../src/auth/better-auth.js'
import { createPools } from '../src/db/pools.js'
import { verifyPrivileges } from '../src/db/verify.js'
import { drizzle } from 'drizzle-orm/postgres-js'

const pools = createPools(config)

try {
  await verifyPrivileges(pools)

  const auth = createAuth(drizzle({ client: pools.auth }), config)
  const session = await auth.api.getSession({
    headers: new Headers({ authorization: 'Bearer invalid' }),
  })

  if (session !== null) {
    throw new Error('Una sesión inválida devolvió datos')
  }

  console.log(`Privilegios correctos. Entorno: ${config.nodeEnv}`)
} finally {
  await pools.close()
}
