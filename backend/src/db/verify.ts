import type { Pools } from './pools.js'

type Query = () => Promise<unknown>

function isPermissionDenied(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '42501'
}

async function denied(query: Query): Promise<boolean> {
  try {
    await query()
    return false
  } catch (error) {
    return isPermissionDenied(error)
  }
}

/**
 * Comprueba que cada pool tiene exactamente los privilegios que debe tener.
 * Si algo falla, el proceso no arranca.
 */
export async function verifyPrivileges(pools: Pools): Promise<void> {
  const [authRole] = await pools.auth<{ name: string }[]>`SELECT current_user AS name`
  const [appRole] = await pools.app<{ name: string }[]>`SELECT current_user AS name`

  if (authRole?.name !== 'auth_service') {
    throw new Error(`El pool de auth usa el rol ${authRole?.name}, se esperaba auth_service`)
  }

  if (appRole?.name !== 'app_user') {
    throw new Error(`El pool de app usa el rol ${appRole?.name}, se esperaba app_user`)
  }

  const authDenied = await denied(() => pools.auth`SELECT 1 FROM public.profiles LIMIT 1`)
  if (!authDenied) {
    throw new Error('auth_service puede leer profiles: falta aislamiento entre esquemas')
  }

  const appDenied = await denied(() => pools.app`SELECT 1 FROM auth.session LIMIT 1`)
  if (!appDenied) {
    throw new Error('app_user puede leer auth.session: falta aislamiento entre esquemas')
  }

  const [schema] = await pools.auth<{ session: string | null }[]>`
    SELECT to_regclass('auth.session')::text AS session
  `

  if (!schema?.session) {
    throw new Error('Falta el esquema auth: ejecuta las migraciones')
  }

  const [bypass] = await pools.app<{ rolbypassrls: boolean }[]>`
    SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user
  `

  if (bypass?.rolbypassrls !== false) {
    throw new Error('app_user tiene BYPASSRLS: la RLS no protegería nada')
  }
}
