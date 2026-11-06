import { randomUUID } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import type { Config } from '../config/schema.js'
import { parseKeyPair } from '../config/keys.js'

export interface AccessToken {
  token: string
  expiresAt: number
  tokenType: 'Bearer'
}

export interface VerifiedToken {
  userId: string
  sessionId: string
}

export interface TokenService {
  sign(userId: string, sessionId: string): Promise<AccessToken>
  verify(token: string): Promise<VerifiedToken>
}

/**
 * Firma y verifica JWT de acceso con Ed25519.
 * El algoritmo se fija en la verificación: un token con `alg: none` o con otro
 * algoritmo se rechaza antes de mirar las claims.
 */
export function createTokenService(config: Config): TokenService {
  const { privateKey, publicKey } = parseKeyPair(
    config.jwtPrivateKeyB64,
    config.jwtPublicKeyB64,
  )

  return {
    async sign(userId, sessionId) {
      const issuedAt = Math.floor(Date.now() / 1000)
      const expiresAt = issuedAt + config.accessTokenTtlSeconds

      const token = await new SignJWT({ sid: sessionId })
        .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT', kid: config.jwtKid })
        .setSubject(userId)
        .setIssuer(config.jwtIssuer)
        .setAudience(config.jwtAudience)
        .setIssuedAt(issuedAt)
        .setExpirationTime(expiresAt)
        .setJti(randomUUID())
        .sign(privateKey)

      return { token, expiresAt, tokenType: 'Bearer' }
    },

    async verify(token) {
      const { payload, protectedHeader } = await jwtVerify(token, publicKey, {
        algorithms: ['EdDSA'],
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
        clockTolerance: 5,
      })

      if (protectedHeader.kid !== config.jwtKid) {
        throw new Error('kid desconocido')
      }

      if (!payload.sub || typeof payload.sid !== 'string') {
        throw new Error('claims incompletos')
      }

      return { userId: payload.sub, sessionId: payload.sid }
    },
  }
}

/** Devuelve el token de un `Authorization: Bearer ...` o `null`. */
export function readBearer(header: string | undefined): string | null {
  if (!header) return null

  const [scheme, value] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null

  return value
}
