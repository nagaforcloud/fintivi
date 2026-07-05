import type { FastifyInstance } from 'fastify'
import { eq, and, gte } from 'drizzle-orm'
import { uploadJobs, transactions, accounts } from '@fintivi/db/schema'
import { dispatchParser } from '@fintivi/parsers'
import { requireAuth } from '../middleware/require-auth.js'
import {
  createUploadJob, updateJobStatus, getJobWithOwnerCheck, logJobEvent,
} from '../lib/jobs.js'
import {
  createSSEStream, replayJobEvents, getJobEmitter,
  getUserStreamCount, incrementUserStreams, decrementUserStreams,
} from '../lib/sse.js'
import { writeAuditLog } from '../lib/audit.js'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.csv', '.pdf', '.xls', '.xlsx']
const MAX_DAILY_UPLOADS = 20
const MAX_CONCURRENT_STREAMS = 5

// MIME type map for allowed extensions
const ALLOWED_MIMES: Record<string, string[]> = {
  '.csv': ['text/csv', 'text/plain', 'application/csv', 'application/octet-stream'],
  '.pdf': ['application/pdf'],
  '.xls': ['application/vnd.ms-excel', 'application/octet-stream'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'],
}

// Magic bytes for content signature validation
const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  '.pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])], // %PDF
  '.xls': [new Uint8Array([0xD0, 0xCF, 0x11, 0xE0])], // CFB
  '.xlsx': [new Uint8Array([0x50, 0x4B, 0x03, 0x04])], // PK zip
}

// Excel macro-enabled extensions to reject
const MACRO_EXTENSIONS = ['.xlsm', '.xlsb', '.xla', '.xlam']

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx === -1 ? '' : filename.slice(idx).toLowerCase()
}

function hasValidMagicBytes(buffer: Buffer, ext: string): boolean {
  const magic = MAGIC_BYTES[ext]
  if (!magic) return true // no magic check needed (e.g., CSV)
  return magic.some((sig) => {
    if (buffer.length < sig.length) return false
    return sig.every((b, i) => buffer[i] === b)
  })
}

function containsExcelMacro(filename: string): boolean {
  const ext = getExtension(filename)
  return MACRO_EXTENSIONS.includes(ext)
}

// Neutralize CSV formula injection in text cells
const FORMULA_START = /^[=+\-@\t\r]/
function neutralizeCsvFormula(value: string): string {
  if (FORMULA_START.test(value)) {
    return "'" + value
  }
  return value
}

// Check if file content is a CSV by examining first few bytes for printable ASCII
function isLikelyCsv(buffer: Buffer): boolean {
  const firstBytes = buffer.subarray(0, Math.min(512, buffer.length))
  const text = firstBytes.toString('utf-8').toLowerCase()
  // CSV files typically have commas and newlines
  return text.includes(',') || text.includes(';')
}

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/uploads', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id

    let filename: string
    let buffer: Buffer
    let mimetype: string

    try {
      const file = await request.file()
      if (!file) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'File is required' },
        })
      }

      filename = file.filename
      mimetype = file.mimetype || 'application/octet-stream'
      const ext = getExtension(filename)

      // Reject macro-enabled extensions
      if (containsExcelMacro(filename)) {
        file.file.resume()
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Excel macro-enabled files are not allowed' },
        })
      }

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        file.file.resume()
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: `Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        })
      }

      // MIME type validation
      const allowedMimes = ALLOWED_MIMES[ext]
      if (allowedMimes && !allowedMimes.includes(mimetype)) {
        file.file.resume()
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: `Invalid MIME type for ${ext}: ${mimetype}` },
        })
      }

      buffer = await file.toBuffer()
      if (buffer.length > MAX_FILE_SIZE) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'File size exceeds 20 MB limit' },
        })
      }

      // Content signature (magic bytes) validation for PDF/Excel
      if (!hasValidMagicBytes(buffer, ext)) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: `File content does not match expected format for ${ext}` },
        })
      }

      // For CSV files without proper MIME, verify they look like CSV
      if (ext === '.csv' && mimetype === 'application/octet-stream') {
        if (!isLikelyCsv(buffer)) {
          return reply.status(400).send({
            error: { code: 'VALIDATION_ERROR', message: 'File content does not appear to be a valid CSV' },
          })
        }
      }

    } catch (err) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid upload' },
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dailyCount = await db.select({ count: uploadJobs.id })
      .from(uploadJobs)
      .where(and(eq(uploadJobs.userId, userId), gte(uploadJobs.createdAt, today)))

    if (dailyCount.length >= MAX_DAILY_UPLOADS) {
      return reply.status(429).send({
        error: { code: 'RATE_LIMITED', message: 'Daily upload limit reached (20 files per day)' },
      })
    }

    const job = await createUploadJob(db, userId, filename, buffer.length, mimetype)

    await writeAuditLog(db, userId, 'upload_create', { jobId: job.id, fileName: filename }, request.ip)

    try {
      await logJobEvent(db, job.id, 'queued', 0, 'Upload received')
      await updateJobStatus(db, job.id, 'queued')
      getJobEmitter(job.id).emit('progress', { stage: 'queued', percent: 0, message: 'Upload received' })

      await logJobEvent(db, job.id, 'validating', 20, 'Validating file...')
      await updateJobStatus(db, job.id, 'validating')
      getJobEmitter(job.id).emit('progress', { stage: 'validating', percent: 20, message: 'Validating file...' })

      await logJobEvent(db, job.id, 'parsing', 50, 'Parsing transactions...')
      await updateJobStatus(db, job.id, 'parsing')
      getJobEmitter(job.id).emit('progress', { stage: 'parsing', percent: 50, message: 'Parsing transactions...' })

      const result = await dispatchParser(buffer, filename)
      const parsedTransactions = result.transactions.map((txn) => {
        const { raw: _raw, ...safeTxn } = txn
        return {
          ...safeTxn,
          description: neutralizeCsvFormula(txn.description),
        }
      })

      await db.update(uploadJobs)
        .set({ metadata: { transactions: parsedTransactions, candidates: result.candidates, warnings: result.warnings } })
        .where(eq(uploadJobs.id, job.id))

      if (result.warnings.length > 0) {
        await logJobEvent(db, job.id, 'preview_ready', 100, `Preview ready: ${parsedTransactions.length} transactions found (${result.warnings.join('; ')})`)
        getJobEmitter(job.id).emit('progress', { stage: 'preview_ready', percent: 100, message: `Preview ready: ${parsedTransactions.length} transactions found (${result.warnings.join('; ')})` })
      } else {
        await logJobEvent(db, job.id, 'preview_ready', 100, `Preview ready: ${parsedTransactions.length} transactions found`)
        getJobEmitter(job.id).emit('progress', { stage: 'preview_ready', percent: 100, message: `Preview ready: ${parsedTransactions.length} transactions found` })
      }

      await updateJobStatus(db, job.id, 'preview_ready')
      getJobEmitter(job.id).emit('complete', { status: 'preview_ready' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Parse failed'
      await logJobEvent(db, job.id, 'failed', 0, message)
      await updateJobStatus(db, job.id, 'failed', message)
      getJobEmitter(job.id).emit('progress', { stage: 'failed', percent: 0, message })
      getJobEmitter(job.id).emit('complete', { status: 'failed', error: message })
      await writeAuditLog(db, userId, 'upload_failure', { jobId: job.id, error: message }, request.ip)
    }

    return reply.status(201).send({ data: { jobId: job.id } })
  })

  app.get('/uploads/:jobId', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const { jobId } = request.params as { jobId: string }

    const job = await getJobWithOwnerCheck(db, jobId, userId)
    if (!job) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Upload job not found' },
      })
    }

    return reply.send({ data: job })
  })

  app.get('/uploads/:jobId/stream', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const { jobId } = request.params as { jobId: string }

    const job = await getJobWithOwnerCheck(db, jobId, userId)
    if (!job) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Upload job not found' },
      })
    }

    if (getUserStreamCount(userId) >= MAX_CONCURRENT_STREAMS) {
      return reply.status(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many concurrent SSE streams (max 5)' },
      })
    }

    incrementUserStreams(userId)

    const stream = createSSEStream(reply, () => {
      decrementUserStreams(userId)
    })

    if (job.status === 'failed' || job.status === 'completed' || job.status === 'completed_with_warnings' || job.status === 'preview_ready') {
      await replayJobEvents(db, stream, jobId)
      stream.send('complete', { status: job.status, error: job.error ?? undefined })
      stream.close()
      decrementUserStreams(userId)
      return
    }

    await replayJobEvents(db, stream, jobId)

    const emitter = getJobEmitter(jobId)

    const onProgress = (data: unknown) => {
      stream.send('progress', data)
    }

    const onComplete = (data: unknown) => {
      stream.send('complete', data)
      cleanup()
    }

    const onError = (err: Error) => {
      stream.send('complete', { status: 'failed', error: err.message })
      cleanup()
    }

    function cleanup() {
      emitter.removeListener('progress', onProgress)
      emitter.removeListener('complete', onComplete)
      emitter.removeListener('error', onError)
      stream.close()
      decrementUserStreams(userId)
    }

    emitter.on('progress', onProgress)
    emitter.on('complete', onComplete)
    emitter.on('error', onError)
  })

  app.get('/uploads/:jobId/preview', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const { jobId } = request.params as { jobId: string }

    const job = await getJobWithOwnerCheck(db, jobId, userId)
    if (!job) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Upload job not found' },
      })
    }

    if (job.status !== 'preview_ready') {
      return reply.status(400).send({
        error: { code: 'INVALID_STATE', message: `Cannot preview job in '${job.status}' state` },
      })
    }

    const metadata = job.metadata as { transactions: Array<{ postedAt: string; description: string; amountMinor: number; currency: string; externalFingerprint: string }>; candidates: unknown[]; warnings: string[] } | null

    const transactions = (metadata?.transactions ?? []).map((txn) => ({
      ...txn,
      description: neutralizeCsvFormula(txn.description),
    }))

    return reply.send({
      data: {
        candidates: metadata?.candidates ?? [],
        transactions,
        warnings: metadata?.warnings ?? [],
      },
    })
  })

  app.post('/uploads/:jobId/confirm', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const { jobId } = request.params as { jobId: string }

    const body = request.body as { accountId?: string }
    const accountId = body?.accountId

    if (!accountId) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'accountId is required' },
      })
    }

    const job = await getJobWithOwnerCheck(db, jobId, userId)
    if (!job) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Upload job not found' },
      })
    }

    if (job.status !== 'preview_ready') {
      return reply.status(400).send({
        error: { code: 'INVALID_STATE', message: `Cannot confirm import in '${job.status}' state` },
      })
    }

    const [acct] = await db.select().from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
      .limit(1)
    if (!acct) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Account not found' },
      })
    }

    const [claimedJob] = await db.update(uploadJobs)
      .set({ status: 'importing', error: null, updatedAt: new Date() })
      .where(and(eq(uploadJobs.id, job.id), eq(uploadJobs.status, 'preview_ready')))
      .returning({ id: uploadJobs.id })
    if (!claimedJob) {
      return reply.status(400).send({
        error: { code: 'INVALID_STATE', message: 'Import has already started' },
      })
    }

    await logJobEvent(db, job.id, 'importing', 50, 'Importing transactions...')
    getJobEmitter(job.id).emit('progress', { stage: 'importing', percent: 50, message: 'Importing transactions...' })

    const metadata = job.metadata as { transactions: Array<{ postedAt: string; description: string; amountMinor: number; currency: string; externalFingerprint: string }> } | null
    const parsedTransactions = metadata?.transactions ?? []

    let imported = 0
    let skipped = 0
    let duplicates = 0
    const seenFingerprints = new Set<string>()

    for (const txn of parsedTransactions) {
      const description = neutralizeCsvFormula(txn.description)

      if (!txn.externalFingerprint) {
        await db.insert(transactions).values({
          userId,
          accountId,
          postedAt: txn.postedAt,
          description,
          amountMinor: txn.amountMinor,
          currency: txn.currency || 'USD',
        })
        imported++
        continue
      }

      if (seenFingerprints.has(txn.externalFingerprint)) {
        duplicates++
        continue
      }
      seenFingerprints.add(txn.externalFingerprint)

      const [existing] = await db.select({ id: transactions.id })
        .from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          eq(transactions.externalFingerprint, txn.externalFingerprint),
        ))
        .limit(1)

      if (existing) {
        skipped++
        continue
      }

      await db.insert(transactions).values({
        userId,
        accountId,
        postedAt: txn.postedAt,
        description,
        amountMinor: txn.amountMinor,
        currency: txn.currency || 'USD',
        externalFingerprint: txn.externalFingerprint,
      })
      imported++
    }

    const hasWarnings = skipped > 0 || duplicates > 0
    const finalStatus = hasWarnings ? 'completed_with_warnings' : 'completed'

    await logJobEvent(db, job.id, finalStatus, 100,
      `Imported ${imported}, skipped ${skipped}, duplicates ${duplicates}`)
    await updateJobStatus(db, job.id, finalStatus)
    getJobEmitter(job.id).emit('progress', {
      stage: finalStatus, percent: 100,
      message: `Imported ${imported}, skipped ${skipped}, duplicates ${duplicates}`,
    })
    getJobEmitter(job.id).emit('complete', { status: finalStatus })

    await writeAuditLog(db, userId, 'upload_confirm', { jobId, accountId, imported, skipped, duplicates }, request.ip)

    return reply.send({ data: { imported, skipped, duplicates } })
  })
}
