import { bigint, index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth.js'

const auditTimestamp = timestamp('created_at', { withTimezone: true }).defaultNow().notNull()

/** Datos públicos del atleta. Uno por usuario; el `user_id` manda la RLS. */
export const profiles = pgTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Registro de eventos de autenticación. Append-only: se inserta, nunca se edita
 * ni se borra. Es la tabla que demuestra el patrón en la etapa 1.
 *
 * Sin FK a `auth.user` a propósito: el histórico debe sobrevivir al borrado de
 * la cuenta, y un `ON DELETE SET NULL` dispararía el trigger append-only.
 */
export const authAuditLog = pgTable(
  'auth_audit_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: text('user_id'),
    event: text('event').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt: auditTimestamp,
  },
  (table) => [index('auth_audit_log_user_id_idx').on(table.userId)],
)
