import { isIP } from 'node:net'

/**
 * Solo se confía en un salto cuando viene de una red privada o loopback.
 * Así una petición directa desde Internet no puede elegir su IP con
 * `X-Forwarded-For`: el socket público nunca es de confianza.
 */
function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4) return false
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }

  const [first, second] = parts as [number, number, number, number]

  if (first === 10 || first === 127) return true
  if (first === 172 && second >= 16 && second <= 31) return true
  if (first === 192 && second === 168) return true
  if (first === 169 && second === 254) return true
  // CGNAT y redes internas de contenedores.
  if (first === 100 && second >= 64 && second <= 127) return true

  return false
}

function isPrivateIPv6(address: string): boolean {
  const [head] = address.split(':')
  if (head === '' || head === undefined) return address === '::1'

  const value = Number.parseInt(head, 16)
  if (Number.isNaN(value)) return false

  // fc00::/7 (ULA, la red privada de Fly.io) y fe80::/10 (link-local).
  if ((value & 0xfe00) === 0xfc00) return true
  if ((value & 0xffc0) === 0xfe80) return true

  return false
}

export function isPrivateAddress(address: string): boolean {
  const clean = address.split('%')[0] ?? ''
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(clean)
  if (mapped?.[1]) return isPrivateIPv4(mapped[1])

  const family = isIP(clean)
  if (family === 4) return isPrivateIPv4(clean)
  if (family === 6) return isPrivateIPv6(clean)

  return false
}

/**
 * Función para `trustProxy` de Fastify. `index` cuenta desde el socket:
 * 0 es el par directo y 1 el primer proxy de la cadena. Nunca se confía en
 * más saltos de los configurados ni en saltos de red pública.
 */
export function createProxyTrust(
  hops: number,
): (address: string, index: number) => boolean {
  return (address, index) => index < hops && isPrivateAddress(address)
}
