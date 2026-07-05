import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { users, accounts, uploadJobs, uploadJobEvents, transactions } from '@fintivi/db/schema'
import type { Db } from '@fintivi/db/client'
import { buildApp } from '../src/server.js'
import { createTestDb, migrateTestDb } from './helpers'

let app: ReturnType<typeof buildApp>
let db: Db
let close: () => Promise<void>

let userId: string
let userBId: string
let tokenA: string
let tokenB: string
let accountId: string

function buildMultipartBody(filename: string, content: string | Buffer, fieldName = 'file', fileMime = 'application/octet-stream'): { body: Buffer; contentType: string } {
  const boundary = '----TestBoundary12345'
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${fileMime}\r\n\r\n`
  const footer = `\r\n--${boundary}--\r\n`
  const body = Buffer.concat([
    Buffer.from(header, 'utf-8'),
    typeof content === 'string' ? Buffer.from(content, 'utf-8') : content,
    Buffer.from(footer, 'utf-8'),
  ])
  return { body, contentType: `multipart/form-data; boundary=${boundary}` }
}

beforeAll(async () => {
  const testDb = createTestDb()
  db = testDb.db
  close = testDb.close
  await migrateTestDb(db)
  app = buildApp({ db })
  await app.ready()

  const [userA] = await db.insert(users).values({
    email: 'uploads-a@test.com',
    market: 'global',
    locale: 'en',
    currency: 'USD',
  }).returning()

  const [userB] = await db.insert(users).values({
    email: 'uploads-b@test.com',
    market: 'global',
    locale: 'en',
    currency: 'USD',
  }).returning()

  userId = userA!.id
  userBId = userB!.id

  const [acct] = await db.insert(accounts).values({
    userId,
    name: "Uploads test account",
    type: 'checking',
    bank: 'Test',
    currency: 'USD',
  }).returning()

  accountId = acct!.id

  tokenA = app.signAccessToken({ id: userId, market: 'global' })
  tokenB = app.signAccessToken({ id: userBId, market: 'global' })
})

afterAll(async () => {
  await app.close()
  await close()
})

const validCsv = 'date,description,amount\n2024-01-15,Test Transaction,-5000\n2024-01-16,Another Transaction,10000'

describe('POST /api/v1/uploads', () => {
  it('rejects unauthenticated requests (401)', async () => {
    const { body, contentType } = buildMultipartBody('test.csv', validCsv)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { 'content-type': contentType },
      body,
    })

    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
  })

  it('unsupported file type (.exe) returns VALIDATION_ERROR', async () => {
    const { body, contentType } = buildMultipartBody('virus.exe', 'fake content')
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects macro-enabled Excel uploads', async () => {
    const { body, contentType } = buildMultipartBody('macro.xlsm', Buffer.from('PK\x03\x04'))
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error.message).toContain('macro')
  })

  it('rejects files whose MIME type does not match the extension', async () => {
    const { body, contentType } = buildMultipartBody('statement.pdf', Buffer.from('%PDF-1.7'), 'file', 'text/plain')
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error.message).toContain('Invalid MIME type')
  })

  it('rejects files whose content signature does not match the extension', async () => {
    const { body, contentType } = buildMultipartBody('statement.pdf', Buffer.from('not a pdf'), 'file', 'application/pdf')
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error.message).toContain('does not match')
  })

  it('valid CSV upload creates upload_jobs row with queued status', async () => {
    const { body, contentType } = buildMultipartBody('test.csv', validCsv)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    expect(res.statusCode).toBe(201)
    const jobId = res.json().data.jobId
    expect(jobId).toBeTruthy()

    const [job] = await db.select().from(uploadJobs).where(eq(uploadJobs.id, jobId)).limit(1)
    expect(job).toBeTruthy()
    expect(job!.userId).toBe(userId)
    expect(job!.fileName).toBe('test.csv')

    const events = await db.select().from(uploadJobEvents).where(eq(uploadJobEvents.jobId, jobId)).orderBy(uploadJobEvents.createdAt)
    expect(events.length).toBeGreaterThanOrEqual(4)
    expect(events[0]!.stage).toBe('queued')
  })

  it('does not count old uploads toward the daily upload limit', async () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000)
    await db.insert(uploadJobs).values(Array.from({ length: 20 }, (_, index) => ({
      userId: userBId,
      fileName: `old-${index}.csv`,
      fileSize: 10,
      mime: 'text/csv',
      status: 'completed' as const,
      createdAt: oldDate,
    })))

    const { body, contentType } = buildMultipartBody('today.csv', validCsv)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenB}`, 'content-type': contentType },
      body,
    })

    expect(res.statusCode).toBe(201)
  })
})

describe('GET /api/v1/uploads/:jobId', () => {
  it('returns job status for owner', async () => {
    const { body, contentType } = buildMultipartBody('status-test.csv', validCsv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    const jobId = createRes.json().data.jobId

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/uploads/${jobId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.id).toBe(jobId)
    expect(res.json().data.status).toBe('preview_ready')
  })

  it('returns 404 for non-owner', async () => {
    const { body, contentType } = buildMultipartBody('owner-test.csv', validCsv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    const jobId = createRes.json().data.jobId

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/uploads/${jobId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('GET /api/v1/uploads/:jobId/stream', () => {
  it('SSE stream first emits latest persisted state', async () => {
    const { body, contentType } = buildMultipartBody('stream-test.csv', validCsv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    const jobId = createRes.json().data.jobId

    const streamRes = await app.inject({
      method: 'GET',
      url: `/api/v1/uploads/${jobId}/stream`,
      headers: { authorization: `Bearer ${tokenA}` },
    })

    expect(streamRes.statusCode).toBe(200)
    expect(streamRes.headers['content-type']).toContain('text/event-stream')

    const bodyText = streamRes.body
    expect(bodyText).toContain('event: progress')
    expect(bodyText).toContain('stage')
    expect(bodyText).toContain('event: complete')
    expect(bodyText).toContain('preview_ready')
  })

  it('User A cannot stream User B upload job', async () => {
    const { body, contentType } = buildMultipartBody('no-peeking.csv', validCsv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    const jobId = createRes.json().data.jobId

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/uploads/${jobId}/stream`,
      headers: { authorization: `Bearer ${tokenB}` },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('GET /api/v1/uploads/:jobId/preview', () => {
  it('shows parser candidates and warnings', async () => {
    const { body, contentType } = buildMultipartBody('preview-test.csv', validCsv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    const jobId = createRes.json().data.jobId

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/uploads/${jobId}/preview`,
      headers: { authorization: `Bearer ${tokenA}` },
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expect(Array.isArray(data.candidates)).toBe(true)
    expect(data.candidates.length).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(data.transactions)).toBe(true)
    expect(data.transactions.length).toBeGreaterThanOrEqual(1)
  })

  it('neutralizes CSV formulas in preview responses', async () => {
    const csv = 'date,description,amount\n2024-03-01,=2+3,-1000'
    const { body, contentType } = buildMultipartBody('formula-preview.csv', csv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/uploads/${createRes.json().data.jobId}/preview`,
      headers: { authorization: `Bearer ${tokenA}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.transactions[0].description).toBe("'=2+3")
  })

  it('returns 404 for non-owner', async () => {
    const { body, contentType } = buildMultipartBody('preview-owner.csv', validCsv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    const jobId = createRes.json().data.jobId

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/uploads/${jobId}/preview`,
      headers: { authorization: `Bearer ${tokenB}` },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('POST /api/v1/uploads/:jobId/confirm', () => {
  it('imports rows idempotently, reports imported/skipped/duplicates', async () => {
    const csv = 'date,description,amount\n2024-02-01,First Import,-1000\n2024-02-02,Second Import,2000'
    const { body, contentType } = buildMultipartBody('confirm-test.csv', csv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    const jobId = createRes.json().data.jobId

    const confirmRes = await app.inject({
      method: 'POST',
      url: `/api/v1/uploads/${jobId}/confirm`,
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: { accountId },
    })

    expect(confirmRes.statusCode).toBe(200)
    const result = confirmRes.json().data
    expect(result.imported).toBeGreaterThanOrEqual(1)
    expect(result.skipped).toBe(0)

    const confirmRes2 = await app.inject({
      method: 'POST',
      url: `/api/v1/uploads/${jobId}/confirm`,
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: { accountId },
    })

    expect(confirmRes2.statusCode).toBe(400)
    expect(confirmRes2.json().error.code).toBe('INVALID_STATE')
  })

  it('neutralizes CSV formulas before persisting imported transactions', async () => {
    const csv = 'date,description,amount\n2024-03-01,=2+3,-1000'
    const { body, contentType } = buildMultipartBody('formula-test.csv', csv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': contentType },
      body,
    })

    const jobId = createRes.json().data.jobId
    const jobRes = await app.inject({
      method: 'GET',
      url: `/api/v1/uploads/${jobId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    })
    expect(jobRes.statusCode).toBe(200)
    const metadata = typeof jobRes.json().data.metadata === 'string' ? JSON.parse(jobRes.json().data.metadata) : jobRes.json().data.metadata
    expect(metadata.transactions[0].description).toBe("'=2+3")
    expect(metadata.transactions[0].raw).toBeUndefined()

    const confirmRes = await app.inject({
      method: 'POST',
      url: `/api/v1/uploads/${jobId}/confirm`,
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: { accountId },
    })

    expect(confirmRes.statusCode).toBe(200)
    const [row] = await db.select().from(transactions).where(and(
      eq(transactions.userId, userId),
      eq(transactions.accountId, accountId),
      eq(transactions.amountMinor, -100000),
    )).limit(1)
    expect(row?.description).toBe("'=2+3")
  })
})
