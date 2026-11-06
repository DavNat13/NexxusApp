import type { FastifyReply } from 'fastify'

/**
 * Copia las cookies que emite Better Auth a la respuesta de Fastify.
 * Es el único punto donde la API escribe cookies de sesión.
 */
export function copySetCookie(reply: FastifyReply, headers: Headers): void {
  const cookies = headers.getSetCookie()

  if (cookies.length > 0) {
    reply.header('set-cookie', cookies)
  }
}
