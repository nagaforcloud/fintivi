import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { marketValues } from '../enums';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text('email'),
    phoneE164: text('phone_e164'),
    displayName: text('display_name'),
    market: text('market', { enum: marketValues }).notNull(),
    locale: text('locale').notNull().default('en'),
    currency: text('currency').notNull().default('USD'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (t) => ({
    emailUnique: uniqueIndex('users_email_unique').on(t.email),
    phoneE164Unique: uniqueIndex('users_phone_e164_unique').on(t.phoneE164),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
