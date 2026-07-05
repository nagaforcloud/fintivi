import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const otpAttempts = sqliteTable(
  'otp_attempts',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    phoneHash: text('phone_hash').notNull(),
    attemptId: text('attempt_id').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    verifiedAt: integer('verified_at', { mode: 'timestamp_ms' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (t) => ({
    phoneHashIdx: index('otp_attempts_phone_hash_idx').on(t.phoneHash),
  }),
);

export type OtpAttempt = typeof otpAttempts.$inferSelect;
export type NewOtpAttempt = typeof otpAttempts.$inferInsert;
