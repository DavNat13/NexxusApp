import type { Pools } from '../../src/db/pools.js'
import { sha256 } from '../../src/auth/hash.js'

/** Borra solo los contadores de los identificadores que usó un test. */
export async function clearThrottle(
  pools: Pools,
  emails: string[],
  ips: string[],
): Promise<void> {
  const keys = [
    ...emails.map((email) => sha256(`account:${email}`)),
    ...ips.map((ip) => sha256(`ip:${ip}`)),
  ]

  for (const key of keys) {
    await pools.auth`DELETE FROM auth.login_throttle WHERE identifier_hash = ${key}`
  }
}

/** Contadores propios de la recuperación: correo e IP con prefijo distinto. */
export async function clearResetThrottle(
  pools: Pools,
  emails: string[],
  ips: string[],
): Promise<void> {
  const keys = [
    ...emails.map((email) => sha256(`reset-account:${email}`)),
    ...ips.map((ip) => sha256(`reset-ip:${ip}`)),
  ]

  for (const key of keys) {
    await pools.auth`DELETE FROM auth.login_throttle WHERE identifier_hash = ${key}`
  }
}
