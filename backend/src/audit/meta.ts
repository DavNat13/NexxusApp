import { isIP } from 'node:net'
import type { FastifyRequest } from 'fastify'

export interface AuditMeta {
  requestId: string
  ip: string | null
  userAgent: string | null
}

/** Normaliza lo que va a la auditoría: IP válida y user-agent acotado. */
export function auditMeta(req: FastifyRequest): AuditMeta {
  const userAgent = req.headers['user-agent']

  return {
    requestId: req.id.slice(0, 128),
    ip: req.ip && isIP(req.ip) ? req.ip : null,
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 512) : null,
  }
}
