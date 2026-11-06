import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth.js'

/** Datos públicos del atleta. Uno por usuario; el `user_id` manda la RLS. */
export const profiles = pgTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
