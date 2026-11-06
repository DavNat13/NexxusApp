import { createPrivateKey, createPublicKey, type KeyObject } from 'node:crypto'

export interface KeyPair {
  privateKey: KeyObject
  publicKey: KeyObject
}

/** Decodifica un PEM en base64 y comprueba que el par es Ed25519 y coherente. */
export function parseKeyPair(privateB64: string, publicB64: string): KeyPair {
  const privateKey = createPrivateKey({
    key: Buffer.from(privateB64, 'base64'),
    format: 'pem',
  })

  const publicKey = createPublicKey({
    key: Buffer.from(publicB64, 'base64'),
    format: 'pem',
  })

  if (privateKey.asymmetricKeyType !== 'ed25519' || publicKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('las claves deben ser Ed25519')
  }

  const derived = createPublicKey(privateKey).export({ type: 'spki', format: 'der' })
  const configured = publicKey.export({ type: 'spki', format: 'der' })

  if (!derived.equals(configured)) {
    throw new Error('la clave pública no corresponde a la privada')
  }

  return { privateKey, publicKey }
}
