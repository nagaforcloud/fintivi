import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { providerValues } from '../enums';
import { users } from './users';

export const authIdentities = sqliteTable(
  'auth_identities',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider', { enum: providerValues }).notNull(),
    providerSubject: text('provider_subject').notNull(),
    verifiedAt: integer('verified_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (t) => ({
    providerSubjectUnique: uniqueIndex('auth_identities_provider_subject_unique').on(t.provider, t.providerSubject),
  }),
);

export type AuthIdentity = typeof authIdentities.$inferSelect;
export type NewAuthIdentity = typeof authIdentities.$inferInsert;
