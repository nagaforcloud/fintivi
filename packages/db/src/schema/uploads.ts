import {
  pgTable, text, bigint, integer, timestamp, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { uploadStatusEnum } from '../enums';
import { users } from './users';

export const uploadJobs = pgTable(
  'upload_jobs',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    mime: text('mime').notNull(),
    status: uploadStatusEnum('status').notNull().default('queued'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => ({
    userStatusIdx: index('upload_jobs_user_status_idx').on(t.userId, t.status),
  }),
);

export const uploadJobEvents = pgTable(
  'upload_job_events',
  {
    id: text('id').primaryKey().default(sql`gen_random_uuid()`),
    jobId: text('job_id').notNull().references(() => uploadJobs.id, { onDelete: 'cascade' }),
    stage: text('stage').notNull(),
    percent: integer('percent').notNull().default(0),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

export type UploadJob = typeof uploadJobs.$inferSelect;
export type NewUploadJob = typeof uploadJobs.$inferInsert;
export type UploadJobEvent = typeof uploadJobEvents.$inferSelect;
export type NewUploadJobEvent = typeof uploadJobEvents.$inferInsert;
