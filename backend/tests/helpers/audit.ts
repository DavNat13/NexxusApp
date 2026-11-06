import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import postgres from 'postgres'

const rootEnv =
  loadEnv({
    path: fileURLToPath(new URL('../../../.env', import.meta.url)),
    processEnv: {},
    quiet: true,
  }).parsed ?? {}

const migratorUrl = process.env.DATABASE_URL_MIGRATOR ?? rootEnv.DATABASE_URL_MIGRATOR

let client: postgres.Sql | null = null

function connection(): postgres.Sql {
  if (!migratorUrl) {
    throw new Error('DATABASE_URL_MIGRATOR es necesario para leer la auditoría')
  }

  client ??= postgres(migratorUrl, { max: 2, onnotice: () => {} })
  return client
}

export interface AuditEventRow {
  event: string
  outcome: string
  reason: string | null
  request_id: string
  user_agent: string | null
}

export interface AuditAttemptRow {
  identifier_hash: string
  event: string
  outcome: string
  reason: string | null
  request_id: string
}

export function auditEvents(userId: string): Promise<AuditEventRow[]> {
  return connection().begin(async (tx) => {
    await tx`SET LOCAL ROLE audit_reader`
    return tx<AuditEventRow[]>`
      SELECT event, outcome, reason, request_id, user_agent
      FROM audit.auth_event WHERE user_id = ${userId} ORDER BY id
    `
  }) as Promise<AuditEventRow[]>
}

export function auditAttempts(identifierHash: string): Promise<AuditAttemptRow[]> {
  return connection().begin(async (tx) => {
    await tx`SET LOCAL ROLE audit_reader`
    return tx<AuditAttemptRow[]>`
      SELECT identifier_hash, event, outcome, reason, request_id
      FROM audit.auth_attempt WHERE identifier_hash = ${identifierHash} ORDER BY id
    `
  }) as Promise<AuditAttemptRow[]>
}

export async function closeAudit(): Promise<void> {
  await client?.end()
  client = null
}
