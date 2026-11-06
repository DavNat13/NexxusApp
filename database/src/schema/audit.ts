import {
  bigint,
  index,
  inet,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { authSchema } from './auth.js'

export const auditSchema = pgSchema('audit')

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull()

/** Eventos con actor autenticado. El sujeto es el usuario de `user_id`. */
export const authEvent = auditSchema.table(
  'auth_event',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: text('user_id').notNull(),
    event: text('event').notNull(),
    outcome: text('outcome').notNull(),
    reason: text('reason'),
    requestId: text('request_id').notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt,
  },
  (table) => [
    index('auth_event_user_id_idx').on(table.userId),
    index('auth_event_created_at_idx').on(table.createdAt),
  ],
)

/**
 * Intentos sin actor autenticado. El identificador va hasheado: la auditoría
 * no debe convertirse en una segunda base de datos de emails.
 */
export const authAttempt = auditSchema.table(
  'auth_attempt',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    identifierHash: text('identifier_hash').notNull(),
    event: text('event').notNull(),
    outcome: text('outcome').notNull(),
    reason: text('reason'),
    requestId: text('request_id').notNull(),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt,
  },
  (table) => [
    index('auth_attempt_identifier_idx').on(table.identifierHash),
    index('auth_attempt_created_at_idx').on(table.createdAt),
  ],
)

/** Contadores de intentos por cuenta. Se actualizan de forma atómica. */
export const loginThrottle = authSchema.table('login_throttle', {
  identifierHash: text('identifier_hash').primaryKey(),
  failures: integer('failures').notNull().default(0),
  windowStart: timestamp('window_start', { withTimezone: true }).defaultNow().notNull(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
