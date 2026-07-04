import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const otpAttempts = pgTable(
  'otp_attempts',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    phoneHash: text('phone_hash').notNull(),
    attemptId: text('attempt_id').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    phoneHashIdx: index('otp_attempts_phone_hash_idx').on(t.phoneHash),
  }),
);

export type OtpAttempt = typeof otpAttempts.$inferSelect;
export type NewOtpAttempt = typeof otpAttempts.$inferInsert;
