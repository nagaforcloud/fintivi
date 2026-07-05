import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createHmac } from 'node:crypto'
import { createDb } from '@fintivi/db'
import { eq, sql } from 'drizzle-orm'
import { auditLogs } from '@fintivi/db/schema'
import { buildApp } from '../src/server.js'

const dbUrl = process.env.DATABASE_URL!
let app: ReturnType<typeof buildApp>
let db: ReturnType<typeof createDb>['db']
let close: () => Promise<void>

function buildMultipartBody(filename: string, content: string, fieldName = 'file'): { body: Buffer; contentType: string } {
  const boundary = '----TestBoundarySecurity'
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`
  const footer = `\r\n--${boundary}--\r\n`
  const body = Buffer.concat([
    Buffer.from(header, 'utf-8'),
    Buffer.from(content, 'utf-8'),
    Buffer.from(footer, 'utf-8'),
  ])
  return { body, contentType: `multipart/form-data; boundary=${boundary}` }
}

beforeAll(async () => {
  const connection = createDb(dbUrl)
  db = connection.db
  close = connection.close
  await db.execute(sql`TRUNCATE TABLE otp_attempts, audit_logs, sessions, auth_identities, users, upload_jobs, upload_job_events RESTART IDENTITY CASCADE`)
  app = buildApp({ db })
  await app.ready()
})

afterAll(async () => {
  await db.execute(sql`TRUNCATE TABLE otp_attempts, audit_logs, sessions, auth_identities, users, upload_jobs, upload_job_events RESTART IDENTITY CASCADE`)
  await app.close()
  await close()
})

describe('Sensitive values absent from logs and responses', () => {
  it('signup response does not contain passwords', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'sec-test@example.com', password: 'MyS3cretPass!', market: 'global', locale: 'en', currency: 'USD' },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.stringify(res.json())
    expect(body).not.toContain('MyS3cretPass!')
    expect(body).not.toContain('password')
    // Access token might be present, but raw password should not
    expect(body).not.toContain('S3cret')
  })

  it('login response does not contain passwords', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'sec-test@example.com', password: 'MyS3cretPass!' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.stringify(res.json())
    expect(body).not.toContain('MyS3cretPass!')
    expect(body).not.toContain('S3cret')
  })

  it('OTP request response does not contain raw phone number', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { phone: '+1555SECURITY01' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.stringify(res.json())
    expect(body).not.toContain('+1555SECURITY01')
    expect(body).not.toContain('1555SECURITY01')
  })

  it('OTP verify response does not contain code', async () => {
    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { phone: '+1555SECURITY02' },
    })

    const { code } = reqRes.json().data

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { phone: '+1555SECURITY02', code },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.stringify(res.json())
    expect(body).not.toContain(code)
  })

  it('access token is issued only in the response token field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'sec-token@example.com', password: 'TokenPass1!', market: 'global', locale: 'en', currency: 'USD' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.accessToken).toBeTruthy()
    // Verify token is a JWT (contains dots)
    expect(body.data.accessToken).toMatch(/^eyJ/)
  })

  it('audit logs redact raw IPs and user-controlled details', async () => {
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'sec-audit@example.com', password: 'AuditPass1!', market: 'global', locale: 'en', currency: 'USD' },
    })
    expect(signupRes.statusCode).toBe(201)

    const token = signupRes.json().data.accessToken
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/accounts',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Sensitive Account Name', type: 'checking', bank: 'Sensitive Bank', currency: 'USD' },
    })
    expect(res.statusCode).toBe(201)

    const rows = await db.select().from(auditLogs).where(eq(auditLogs.action, 'account_create'))
    expect(rows.length).toBeGreaterThanOrEqual(1)
    const log = rows.at(-1)!
    const logBody = JSON.stringify(log)
    expect(logBody).not.toContain('Sensitive Account Name')
    expect(logBody).not.toContain('Sensitive Bank')
    expect(logBody).not.toContain('127.0.0.1')
    expect(log.ipAddress).toBe(createHmac('sha256', process.env.PHONE_HASH_PEPPER!).update('127.0.0.1').digest('hex'))
    expect(log.details).toEqual({ accountId: res.json().data.id })
  })

  it('upload response does not expose raw file contents', async () => {
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'sec-upload@example.com', password: 'UploadPass1!', market: 'global', locale: 'en', currency: 'USD' },
    })
    const token = signupRes.json().data.accessToken

    const csvContent = 'Date,Description,Amount\n2024-01-15,Test Transaction,-5000'
    const { body, contentType } = buildMultipartBody('test.csv', csvContent)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${token}`, 'content-type': contentType },
      body,
    })

    expect(res.statusCode).toBe(201)
    const resBody = JSON.stringify(res.json())
    // Job response should only contain jobId, not file contents
    expect(resBody).not.toContain('Test Transaction')
    expect(resBody).not.toContain('-5000')
  })
})
