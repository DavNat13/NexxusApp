import { createPrivateKey, generateKeyPairSync } from 'node:crypto'
import { SignJWT } from 'jose'
import { describe, expect, it } from 'vitest'
import { createTokenService } from '../src/auth/access-token.js'
import { config } from '../src/config/env.js'

const tokens = createTokenService(config)
const privateKey = createPrivateKey({
  key: Buffer.from(config.jwtPrivateKeyB64, 'base64'),
  format: 'pem',
})

function otherKeys() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')

  return {
    jwtPrivateKeyB64: Buffer.from(
      privateKey.export({ type: 'pkcs8', format: 'pem' }),
    ).toString('base64'),
    jwtPublicKeyB64: Buffer.from(
      publicKey.export({ type: 'spki', format: 'pem' }),
    ).toString('base64'),
  }
}

function algNone(claims: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT', kid: config.jwtKid }),
  ).toString('base64url')
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')

  return `${header}.${payload}.`
}

describe('access token EdDSA', () => {
  it('firma y verifica con sub y sid', async () => {
    const access = await tokens.sign('user-1', 'session-1')
    const verified = await tokens.verify(access.token)

    expect(verified).toEqual({ userId: 'user-1', sessionId: 'session-1' })
    expect(access.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
    expect(access.tokenType).toBe('Bearer')
  })

  it('rechaza un token expirado', async () => {
    const expired = createTokenService({ ...config, accessTokenTtlSeconds: -60 })
    const access = await expired.sign('user-1', 'session-1')

    await expect(tokens.verify(access.token)).rejects.toThrow()
  })

  it('rechaza una firma de otra clave', async () => {
    const forged = createTokenService({ ...config, ...otherKeys() })
    const access = await forged.sign('user-1', 'session-1')

    await expect(tokens.verify(access.token)).rejects.toThrow()
  })

  it('rechaza un kid desconocido aunque la firma sea válida', async () => {
    const rotated = createTokenService({ ...config, jwtKid: 'v2' })
    const access = await rotated.sign('user-1', 'session-1')

    await expect(tokens.verify(access.token)).rejects.toThrow(/kid/)
  })

  it('rechaza un emisor distinto', async () => {
    const foreign = createTokenService({ ...config, jwtIssuer: 'otro-emisor' })
    const access = await foreign.sign('user-1', 'session-1')

    await expect(tokens.verify(access.token)).rejects.toThrow()
  })

  it('rechaza alg none', async () => {
    const forged = algNone({
      sub: 'user-1',
      sid: 'session-1',
      iss: config.jwtIssuer,
      aud: config.jwtAudience,
      exp: Math.floor(Date.now() / 1000) + 900,
    })

    await expect(tokens.verify(forged)).rejects.toThrow()
  })

  it('rechaza un token sin sid', async () => {
    const noSid = await new SignJWT({})
      .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT', kid: config.jwtKid })
      .setSubject('user-1')
      .setIssuer(config.jwtIssuer)
      .setAudience(config.jwtAudience)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(privateKey)

    await expect(tokens.verify(noSid)).rejects.toThrow(/claims/)
  })
})
