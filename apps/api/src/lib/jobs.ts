import { eq } from 'drizzle-orm'
import { uploadJobs, uploadJobEvents, type UploadJob, type UploadJobEvent } from '@fintivi/db/schema'
import type { Db } from '@fintivi/db/client'

export async function createUploadJob(
  db: Db,
  userId: string,
  fileName: string,
  fileSize: number,
  mime: string,
): Promise<UploadJob> {
  const [job] = await db.insert(uploadJobs).values({
    userId,
    fileName,
    fileSize,
    mime,
    status: 'queued',
  }).returning()
  return job!
}

export async function updateJobStatus(
  db: Db,
  jobId: string,
  status: UploadJob['status'],
  error?: string,
): Promise<void> {
  await db.update(uploadJobs)
    .set({ status, error: error ?? null, updatedAt: new Date() })
    .where(eq(uploadJobs.id, jobId))
}

export async function getJob(db: Db, jobId: string): Promise<UploadJob | undefined> {
  const [job] = await db.select().from(uploadJobs).where(eq(uploadJobs.id, jobId)).limit(1)
  return job
}

export async function getJobWithOwnerCheck(
  db: Db,
  jobId: string,
  userId: string,
): Promise<UploadJob | undefined> {
  const [job] = await db.select().from(uploadJobs)
    .where(eq(uploadJobs.id, jobId))
    .limit(1)
  if (job && job.userId !== userId) return undefined
  return job
}

export async function logJobEvent(
  db: Db,
  jobId: string,
  stage: string,
  percent: number,
  message: string,
): Promise<UploadJobEvent> {
  const [event] = await db.insert(uploadJobEvents).values({
    jobId,
    stage,
    percent,
    message,
  }).returning()
  return event!
}

export async function getJobEvents(db: Db, jobId: string): Promise<UploadJobEvent[]> {
  return db.select().from(uploadJobEvents)
    .where(eq(uploadJobEvents.jobId, jobId))
    .orderBy(uploadJobEvents.createdAt)
}

export async function countUserUploadsToday(db: Db, userId: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const rows = await db.select({ count: uploadJobs.id })
    .from(uploadJobs)
    .where(eq(uploadJobs.userId, userId))
  return rows.length
}
