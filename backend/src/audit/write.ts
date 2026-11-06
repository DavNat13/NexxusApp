import type postgres from 'postgres'
import type { FastifyBaseLogger } from 'fastify'
import type { AuditMeta } from './meta.js'

export type AuditOutcome = 'success' | 'failure'

export interface AuditWriter {
  event(
    meta: AuditMeta,
    userId: string,
    event: string,
    outcome: AuditOutcome,
    reason?: string,
  ): Promise<void>
  attempt(
    meta: AuditMeta,
    identifierHash: string,
    event: string,
    outcome: AuditOutcome,
    reason?: string,
  ): Promise<void>
}

/**
 * La auditoría nunca tumba la petición: si la escritura falla se registra el
 * fallo sin datos personales. `auth_service` tiene INSERT pero no SELECT.
 */
export function createAudit(pool: postgres.Sql, log: FastifyBaseLogger): AuditWriter {
  function failed(meta: AuditMeta, event: string): void {
    log.warn({ requestId: meta.requestId, event }, 'no se pudo escribir la auditoría')
  }

  return {
    async event(meta, userId, event, outcome, reason) {
      try {
        await pool`
          INSERT INTO audit.auth_event
            (user_id, event, outcome, reason, request_id, ip_address, user_agent)
          VALUES
            (${userId}, ${event}, ${outcome}, ${reason ?? null}, ${meta.requestId}, ${meta.ip}, ${meta.userAgent})
        `
      } catch {
        failed(meta, event)
      }
    },

    async attempt(meta, identifierHash, event, outcome, reason) {
      try {
        await pool`
          INSERT INTO audit.auth_attempt
            (identifier_hash, event, outcome, reason, request_id, ip_address, user_agent)
          VALUES
            (${identifierHash}, ${event}, ${outcome}, ${reason ?? null}, ${meta.requestId}, ${meta.ip}, ${meta.userAgent})
        `
      } catch {
        failed(meta, event)
      }
    },
  }
}
