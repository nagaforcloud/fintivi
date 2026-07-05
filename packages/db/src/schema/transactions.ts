import { desc } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { accounts } from './accounts';
import { categories } from './categories';

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    postedAt: text('posted_at').notNull(),
    description: text('description').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull().default('USD'),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    notes: text('notes'),
    externalFingerprint: text('external_fingerprint'),
    raw: text('raw').$type<Record<string, unknown> | null>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (t) => ({
    userPostedAtIdx: index('transactions_user_posted_at_idx').on(t.userId, desc(t.postedAt)),
    userAccountPostedAtIdx: index('transactions_user_account_posted_at_idx').on(t.userId, t.accountId, desc(t.postedAt)),
    userCategoryPostedAtIdx: index('transactions_user_category_posted_at_idx').on(t.userId, t.categoryId, desc(t.postedAt)),
  }),
);

export const transactionSplits = sqliteTable(
  'transaction_splits',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    amountMinor: integer('amount_minor').notNull(),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionSplit = typeof transactionSplits.$inferSelect;
export type NewTransactionSplit = typeof transactionSplits.$inferInsert;
