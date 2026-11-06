import { afterAll, describe, expect, it } from 'vitest'
import { config } from '../src/config/env.js'
import { createPools } from '../src/db/pools.js'
import { verifyPrivileges } from '../src/db/verify.js'

const pools = createPools(config)

afterAll(async () => {
  await pools.close()
})

describe('privilegios reales de los pools', () => {
  it('cada pool usa su rol y no puede cruzar de esquema', async () => {
    await expect(verifyPrivileges(pools)).resolves.toBeUndefined()
  })

  it('falla si los roles están cruzados', async () => {
    const swapped = createPools({
      ...config,
      databaseUrlAuth: config.databaseUrlApp,
      databaseUrlApp: config.databaseUrlAuth,
    })

    try {
      await expect(verifyPrivileges(swapped)).rejects.toThrow(/auth_service|app_user/)
    } finally {
      await swapped.close()
    }
  })

  it('app_user no puede leer la tabla de sesiones', async () => {
    await expect(pools.app`SELECT 1 FROM auth.session LIMIT 1`).rejects.toThrow(
      /permission denied/,
    )
  })

  it('auth_service no puede leer los perfiles', async () => {
    await expect(pools.auth`SELECT 1 FROM public.profiles LIMIT 1`).rejects.toThrow(
      /permission denied/,
    )
  })
})
