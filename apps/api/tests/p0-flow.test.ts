import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import type { Db } from '@fintivi/db/client'
import { buildApp } from '../src/server.js'
import { createTestDb, migrateTestDb } from './helpers'

vi.mock('@fintivi/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fintivi/auth')>()
  return {
    ...actual,
    verifyGoogleToken: vi.fn().mockImplementation(
      async (_idToken: string, _clientId: string) => ({
        sub: 'google-sub-123',
        email: 'google-user@test.com',
        emailVerified: true,
      }),
    ),
  }
})

let app: ReturnType<typeof buildApp>
let db: Db
let close: () => Promise<void>

function buildMultipartBody(filename: string, content: string, fieldName = 'file'): { body: Buffer; contentType: string } {
  const boundary = '----TestBoundaryP0Flow'
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`
  const footer = `\r\n--${boundary}--\r\n`
  const body = Buffer.concat([
    Buffer.from(header, 'utf-8'),
    Buffer.from(content, 'utf-8'),
    Buffer.from(footer, 'utf-8'),
  ])
  return { body, contentType: `multipart/form-data; boundary=${boundary}` }
}

const globalCsv = 'Date,Description,Amount\n2026-01-15,Amazon Purchase,-29.99\n2026-01-16,Starbucks Coffee,-5.50\n2026-01-17,Salary Deposit,5000.00\n2026-01-18,Uber Ride,-15.75\n2026-01-19,Netflix Subscription,-15.99'
const indiaCsv = 'Transaction Date,Narration,Debit Amount,Credit Amount\n01-01-2026,UPI PAYMENT,500.00,\n02-01-2026,SALARY CREDIT,,75000.00\n03-01-2026,AMAZON PAY,1200.00,\n04-01-2026,SWIGGY ORDER,345.00,\n05-01-2026,MOBILE RECHARGE,299.00,'

beforeAll(async () => {
  const testDb = createTestDb()
  db = testDb.db
  close = testDb.close
  await migrateTestDb(db)
  app = buildApp({ db })
  await app.ready()
})

afterAll(async () => {
  await app.close()
  await close()
})

describe('E2E P0: Email signup -> upload global -> confirm -> list -> dashboard', () => {
  let accessToken: string
  let refreshToken: string
  let accountId: string

  it('1. signs up with email/password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'p0-email@test.com', password: 'StrongPass1!', market: 'global', locale: 'en', currency: 'USD' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.user.email).toBe('p0-email@test.com')
    expect(body.data.accessToken).toBeTruthy()
    accessToken = body.data.accessToken
    refreshToken = body.data.refreshToken
  })

  it('2. creates an account', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/accounts',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'P0 Checking', type: 'checking', bank: 'P0 Bank', currency: 'USD' },
    })

    expect(res.statusCode).toBe(201)
    accountId = res.json().data.id
    expect(accountId).toBeTruthy()
  })

  it('3. uploads global sample CSV', async () => {
    const { body, contentType } = buildMultipartBody('global-sample.csv', globalCsv)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': contentType },
      body,
    })

    expect(res.statusCode).toBe(201)
    const jobId = res.json().data.jobId
    expect(jobId).toBeTruthy()
  })

  it('4. previews the upload job', async () => {
    const { body, contentType } = buildMultipartBody('global-preview.csv', globalCsv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': contentType },
      body,
    })

    const jobId = createRes.json().data.jobId

    const previewRes = await app.inject({
      method: 'GET',
      url: `/api/v1/uploads/${jobId}/preview`,
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(previewRes.statusCode).toBe(200)
    const preview = previewRes.json().data
    expect(Array.isArray(preview.transactions)).toBe(true)
    expect(preview.transactions.length).toBe(5)
    expect(preview.transactions[0].description).toBe('Amazon Purchase')
    expect(preview.candidates.length).toBeGreaterThanOrEqual(1)
  })

  it('5. confirms upload and imports transactions', async () => {
    const { body, contentType } = buildMultipartBody('global-confirm.csv', globalCsv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': contentType },
      body,
    })

    const jobId = createRes.json().data.jobId

    const confirmRes = await app.inject({
      method: 'POST',
      url: `/api/v1/uploads/${jobId}/confirm`,
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: { accountId },
    })

    expect(confirmRes.statusCode).toBe(200)
    const result = confirmRes.json().data
    expect(result.imported).toBeGreaterThanOrEqual(1)
  })

  it('6. lists transactions containing imported data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/transactions',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    const descriptions = body.data.map((t: { description: string }) => t.description)
    expect(descriptions).toContain('Amazon Purchase')
    expect(descriptions).toContain('Salary Deposit')
  })

  it('7. returns dashboard with cashflow and recent transactions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expect(data.cashflow).toBeDefined()
    expect(data.accounts.length).toBeGreaterThanOrEqual(1)
    expect(data.recentTransactions.length).toBeGreaterThanOrEqual(1)
    expect(data.dataHealth.lastUploadAt).toBeTruthy()
  })

  it('8. refresh token rotation works', async () => {
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    })

    expect(refreshRes.statusCode).toBe(200)
    const newTokens = refreshRes.json().data
    expect(newTokens.accessToken).toBeTruthy()
    expect(newTokens.refreshToken).not.toBe(refreshToken)
  })
})

describe('E2E P0: Phone OTP signup -> upload India sample -> confirm -> list -> dashboard', () => {
  let accessToken: string
  let accountId: string

  it('1. requests OTP for phone', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { phone: '+1555P0FLOW01' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.expiresAt).toBeTruthy()
    expect(body.data.code).toBeTruthy()
  })

  it('2. verifies OTP and receives tokens', async () => {
    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { phone: '+1555P0FLOW02' },
    })

    const { code } = reqRes.json().data

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { phone: '+1555P0FLOW02', code },
    })

    expect(verifyRes.statusCode).toBe(200)
    const body = verifyRes.json()
    expect(body.data.accessToken).toBeTruthy()
    accessToken = body.data.accessToken
  })

  it('3. creates an account', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/accounts',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: 'P0 India Account', type: 'savings', bank: 'P0 Bank', currency: 'INR' },
    })

    expect(res.statusCode).toBe(201)
    accountId = res.json().data.id
    expect(accountId).toBeTruthy()
  })

  it('4. uploads India sample CSV', async () => {
    const { body, contentType } = buildMultipartBody('india-sample.csv', indiaCsv)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': contentType },
      body,
    })

    expect(res.statusCode).toBe(201)
    const jobId = res.json().data.jobId
    expect(jobId).toBeTruthy()
  })

  it('5. previews India upload candidates', async () => {
    const { body, contentType } = buildMultipartBody('india-preview.csv', indiaCsv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': contentType },
      body,
    })

    const jobId = createRes.json().data.jobId

    const previewRes = await app.inject({
      method: 'GET',
      url: `/api/v1/uploads/${jobId}/preview`,
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(previewRes.statusCode).toBe(200)
    const preview = previewRes.json().data
    expect(Array.isArray(preview.transactions)).toBe(true)
    expect(preview.transactions.length).toBeGreaterThanOrEqual(1)
  })

  it('6. confirms India upload', async () => {
    const { body, contentType } = buildMultipartBody('india-confirm.csv', indiaCsv)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': contentType },
      body,
    })

    const jobId = createRes.json().data.jobId

    const confirmRes = await app.inject({
      method: 'POST',
      url: `/api/v1/uploads/${jobId}/confirm`,
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: { accountId },
    })

    expect(confirmRes.statusCode).toBe(200)
    const result = confirmRes.json().data
    expect(result.imported).toBeGreaterThanOrEqual(1)
  })

  it('7. lists transactions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/transactions',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
  })

  it('8. returns dashboard with India data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    const data = res.json().data
    expect(data.cashflow).toBeDefined()
    expect(data.accounts.length).toBeGreaterThanOrEqual(1)
    expect(data.dataHealth.lastUploadAt).toBeTruthy()
  })

  it('9. user isolation: another user sees empty dashboard', async () => {
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'p0-isolated@test.com', password: 'OtherPass1!', market: 'global', locale: 'en', currency: 'USD' },
    })

    const otherToken = otherRes.json().data.accessToken

    const dashRes = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard',
      headers: { authorization: `Bearer ${otherToken}` },
    })

    expect(dashRes.statusCode).toBe(200)
    const dashData = dashRes.json().data
    expect(dashData.cashflow.incomeMinor).toBe(0)
    expect(dashData.cashflow.expenseMinor).toBe(0)
    expect(dashData.recentTransactions).toEqual([])
  })
})

describe('E2E P0: Google OAuth callback (mocked) -> /users/me', () => {
  let accessToken: string

  it('mocks Google token exchange and creates user via callback', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (url: RequestInfo | URL) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ id_token: 'mocked-google-id-token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return originalFetch(url)
    }

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/google/callback?code=test-auth-code',
    })

    globalThis.fetch = originalFetch

    expect(res.statusCode).toBe(302)
    const location = res.headers.location as string
    expect(location).toContain('auth/google/callback#')

    const fragment = new URLSearchParams(location.split('#')[1] ?? '')
    const token = fragment.get('accessToken')
    expect(token).toBeTruthy()
    expect(fragment.get('email')).toBe('google-user@test.com')
    accessToken = token!
  })

  it('GET /users/me returns the Google-authenticated user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    const user = res.json().data
    expect(user.email).toBe('google-user@test.com')
  })

  it('PATCH /users/me updates display name', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { displayName: 'Google User', locale: 'en' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.displayName).toBe('Google User')
  })
})

describe('E2E P0: Rate limit behavior', () => {
  it('upload daily limit is enforced (20 per day)', async () => {
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'p0-ratelimit@test.com', password: 'LimitPass1!', market: 'global', locale: 'en', currency: 'USD' },
    })

    const token = signupRes.json().data.accessToken

    const { body, contentType } = buildMultipartBody('test.csv', 'Date,Description,Amount\n2026-01-01,Test,1000')
    let lastStatus = 0
    for (let i = 0; i < 22; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/uploads',
        headers: { authorization: `Bearer ${token}`, 'content-type': contentType },
        body,
      })
      lastStatus = res.statusCode
    }

    expect(lastStatus).toBe(429)
  })
})
