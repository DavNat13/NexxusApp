import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { parseConfig } from '../src/config/schema.js'

const { privateKey, publicKey } = generateKeyPairSync('ed25519')

const JWT_PRIVATE_KEY_B64 = Buffer.from(
  privateKey.export({ type: 'pkcs8', format: 'pem' }),
).toString('base64')
const JWT_PUBLIC_KEY_B64 = Buffer.from(
  publicKey.export({ type: 'spki', format: 'pem' }),
).toString('base64')

function baseEnv(): NodeJS.ProcessEnv {
  return {
    DATABASE_URL_AUTH: 'postgres://auth_service:pw@localhost:5433/nexxus_dev',
    DATABASE_URL_APP: 'postgres://app_user:pw@localhost:5433/nexxus_dev',
    BETTER_AUTH_SECRET: 'x'.repeat(32),
    BETTER_AUTH_URL: 'http://localhost:3000',
    JWT_PRIVATE_KEY_B64,
    JWT_PUBLIC_KEY_B64,
  }
}

describe('configuración de la API', () => {
  it('acepta un entorno válido', () => {
    const config = parseConfig(baseEnv())
    expect(config.databaseUrlAuth).toContain('auth_service')
    expect(config.port).toBe(3000)
    expect(config.trustedOrigins).toEqual([])
  })

  it('rechaza el rol migrator en la API', () => {
    const env = baseEnv()
    env.DATABASE_URL_AUTH = 'postgres://migrator:pw@localhost:5433/nexxus_dev'
    expect(() => parseConfig(env)).toThrow(/auth_service/)
  })

  it('rechaza credenciales de migrador en el entorno', () => {
    const env = baseEnv()
    env.DATABASE_URL_MIGRATOR = 'postgres://migrator:pw@localhost:5433/nexxus_dev'
    expect(() => parseConfig(env)).toThrow(/no debe conocer/)
  })

  it('rechaza que los dos pools apunten a la misma URL', () => {
    const env = baseEnv()
    env.DATABASE_URL_APP = env.DATABASE_URL_AUTH
    expect(() => parseConfig(env)).toThrow(/no puede coincidir/)
  })

  it('rechaza un secreto corto', () => {
    const env = baseEnv()
    env.BETTER_AUTH_SECRET = 'corto'
    expect(() => parseConfig(env)).toThrow(/Configuración inválida/)
  })

  it('exige https en producción', () => {
    const env = baseEnv()
    env.NODE_ENV = 'production'
    expect(() => parseConfig(env)).toThrow(/https/)
  })

  it('rechaza un par de claves que no coincide', () => {
    const env = baseEnv()
    const other = generateKeyPairSync('ed25519')
    env.JWT_PUBLIC_KEY_B64 = Buffer.from(
      other.publicKey.export({ type: 'spki', format: 'pem' }),
    ).toString('base64')

    expect(() => parseConfig(env)).toThrow(/par de claves inválido/)
  })

  it('rechaza una vida de access token fuera de rango', () => {
    const env = baseEnv()
    env.ACCESS_TOKEN_TTL_SECONDS = '10'
    expect(() => parseConfig(env)).toThrow(/ACCESS_TOKEN_TTL_SECONDS/)
  })

  it('no filtra valores en el mensaje de error', () => {
    const env = baseEnv()
    env.BETTER_AUTH_SECRET = 'secreto-que-no-debe-aparecer'
    expect(() => parseConfig(env)).toThrow(/Configuración inválida/)
    expect(() => parseConfig(env)).not.toThrow(/secreto-que-no-debe-aparecer/)
  })
})
