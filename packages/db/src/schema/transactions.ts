import {
  pgTable, text, bigint, date, jsonb, timestamp, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { accounts } from './accounts';
import { categories } from './categories';

export const transactions = pgTable(
  'transactions',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    postedAt: date('posted_at').notNull(),
    description: text('description').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currency: text('currency').notNull().default('USD'),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    notes: text('notes'),
    externalFingerprint: text('external_fingerprint'),
    raw: jsonb('raw'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userPostedAtIdx: index('transactions_user_posted_at_idx').on(t.userId, t.postedAt.desc()),
    userAccountPostedAtIdx: index('transactions_user_account_posted_at_idx').on(t.userId, t.accountId, t.postedAt.desc()),
    userCategoryPostedAtIdx: index('transactions_user_category_posted_at_idx').on(t.userId, t.categoryId, t.postedAt.desc()),
  }),
);

export const transactionSplits = pgTable(
  'transaction_splits',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionSplit = typeof transactionSplits.$inferSelect;
export type NewTransactionSplit = typeof transactionSplits.$inferInsert;
