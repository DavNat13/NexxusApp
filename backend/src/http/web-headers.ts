import type { IncomingHttpHeaders } from 'node:http'

/** Convierte cabeceras de Node al tipo `Headers` que espera Better Auth. */
export function toWebHeaders(nodeHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers()

  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value === undefined) continue

    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item)
    } else {
      headers.set(key, value)
    }
  }

  return headers
}
