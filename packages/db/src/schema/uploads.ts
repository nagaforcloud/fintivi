import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { uploadStatusValues } from '../enums';
import { users } from './users';

export const uploadJobs = sqliteTable(
  'upload_jobs',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    fileSize: integer('file_size').notNull(),
    mime: text('mime').notNull(),
    status: text('status', { enum: uploadStatusValues }).notNull().default('queued'),
    error: text('error'),
    metadata: text('metadata').$type<Record<string, unknown> | null>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  },
  (t) => ({
    userStatusIdx: index('upload_jobs_user_status_idx').on(t.userId, t.status),
  }),
);

export const uploadJobEvents = sqliteTable(
  'upload_job_events',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    jobId: text('job_id').notNull().references(() => uploadJobs.id, { onDelete: 'cascade' }),
    stage: text('stage').notNull(),
    percent: integer('percent').notNull().default(0),
    message: text('message').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
);

export type UploadJob = typeof uploadJobs.$inferSelect;
export type NewUploadJob = typeof uploadJobs.$inferInsert;
export type UploadJobEvent = typeof uploadJobEvents.$inferSelect;
export type NewUploadJobEvent = typeof uploadJobEvents.$inferInsert;
