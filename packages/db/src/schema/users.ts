import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { marketEnum } from '../enums';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    email: text('email'),
    phoneE164: text('phone_e164'),
    displayName: text('display_name'),
    market: marketEnum('market').notNull(),
    locale: text('locale').notNull().default('en'),
    currency: text('currency').notNull().default('USD'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex('users_email_unique').on(t.email),
    phoneE164Unique: uniqueIndex('users_phone_e164_unique').on(t.phoneE164),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
