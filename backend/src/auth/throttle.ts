import type postgres from 'postgres'

export interface ThrottlePolicy {
  limit: number
  windowSeconds: number
  lockSeconds: number
}

/** 5 fallos por cuenta en 15 minutos. */
export const ACCOUNT_POLICY: ThrottlePolicy = {
  limit: 5,
  windowSeconds: 900,
  lockSeconds: 900,
}

/** 20 fallos por IP en 15 minutos: frena el barrido de muchas cuentas. */
export const IP_POLICY: ThrottlePolicy = {
  limit: 20,
  windowSeconds: 900,
  lockSeconds: 900,
}

/** 10 intentos de registro por IP en 15 minutos: frena el escaneo de correos. */
export const REGISTER_IP_POLICY: ThrottlePolicy = {
  limit: 10,
  windowSeconds: 900,
  lockSeconds: 900,
}

/** 5 solicitudes de código por correo o IP en 15 minutos. */
export const RESET_REQUEST_POLICY: ThrottlePolicy = {
  limit: 5,
  windowSeconds: 900,
  lockSeconds: 900,
}

/** 10 intentos de código por correo o IP en 15 minutos (además de los 3 del OTP). */
export const RESET_VERIFY_POLICY: ThrottlePolicy = {
  limit: 10,
  windowSeconds: 900,
  lockSeconds: 900,
}

export interface LockStatus {
  locked: boolean
  retryAfterSeconds: number
}

export interface ThrottleStore {
  check(keys: string[]): Promise<LockStatus>
  failure(key: string, policy: ThrottlePolicy): Promise<void>
  reset(keys: string[]): Promise<void>
}

export function createThrottle(pool: postgres.Sql): ThrottleStore {
  return {
    async check(keys) {
      const results = await Promise.all(
        keys.map(
          (key) => pool<{ retry_after: number }[]>`
            SELECT GREATEST(1, CEIL(EXTRACT(EPOCH FROM (locked_until - now()))))::int AS retry_after
            FROM auth.login_throttle
            WHERE identifier_hash = ${key} AND locked_until > now()
          `,
        ),
      )

      const retries = results.flat().map((row) => row.retry_after)
      if (retries.length === 0) return { locked: false, retryAfterSeconds: 0 }

      return { locked: true, retryAfterSeconds: Math.max(...retries) }
    },

    async failure(key, policy) {
      const { limit, windowSeconds, lockSeconds } = policy

      await pool`
        INSERT INTO auth.login_throttle (identifier_hash, failures, window_start, updated_at)
        VALUES (${key}, 1, now(), now())
        ON CONFLICT (identifier_hash) DO UPDATE SET
          failures = CASE
            WHEN login_throttle.window_start < now() - (${windowSeconds}::double precision * interval '1 second')
              OR login_throttle.locked_until <= now()
            THEN 1
            ELSE login_throttle.failures + 1
          END,
          window_start = CASE
            WHEN login_throttle.window_start < now() - (${windowSeconds}::double precision * interval '1 second')
              OR login_throttle.locked_until <= now()
            THEN now()
            ELSE login_throttle.window_start
          END,
          locked_until = CASE
            WHEN (
              CASE
                WHEN login_throttle.window_start < now() - (${windowSeconds}::double precision * interval '1 second')
                  OR login_throttle.locked_until <= now()
                THEN 1
                ELSE login_throttle.failures + 1
              END
            ) >= ${limit}
            THEN now() + (${lockSeconds}::double precision * interval '1 second')
            WHEN login_throttle.locked_until > now() THEN login_throttle.locked_until
            ELSE NULL
          END,
          updated_at = now()
      `
    },

    async reset(keys) {
      for (const key of keys) {
        await pool`DELETE FROM auth.login_throttle WHERE identifier_hash = ${key}`
      }
    },
  }
}
