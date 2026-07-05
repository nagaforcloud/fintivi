import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { categoryTypeValues, matchTypeValues } from '../enums';
import { users } from './users';

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type', { enum: categoryTypeValues }).notNull(),
    color: text('color'),
    icon: text('icon'),
    isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
);

export const categoryRules = sqliteTable(
  'category_rules',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
    pattern: text('pattern').notNull(),
    matchType: text('match_type', { enum: matchTypeValues }).notNull().default('contains'),
    priority: integer('priority').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryRule = typeof categoryRules.$inferSelect;
export type NewCategoryRule = typeof categoryRules.$inferInsert;
