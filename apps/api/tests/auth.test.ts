import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createDb } from '@fintivi/db'
import { sql } from 'drizzle-orm'
import { buildApp } from '../src/server.js'

const dbUrl = process.env.DATABASE_URL!
let app: ReturnType<typeof buildApp>
let db: ReturnType<typeof createDb>['db']
let close: () => Promise<void>

beforeAll(async () => {
  const connection = createDb(dbUrl)
  db = connection.db
  close = connection.close
  app = buildApp({ db })
})

afterAll(async () => {
  await db.execute(sql`TRUNCATE TABLE audit_logs, sessions, auth_identities, users RESTART IDENTITY CASCADE`)
  await app.close()
  await close()
})

const testUser = {
  email: 'auth-test@example.com',
  password: 'TestPass123!',
  market: 'global' as const,
  locale: 'en',
  currency: 'USD',
}

describe('POST /api/v1/auth/signup', () => {
  it('creates user and returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: testUser,
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.user.email).toBe(testUser.email)
    expect(body.data.accessToken).toBeTruthy()
    expect(body.data.refreshToken).toBeTruthy()
    expect(body.data.sessionId).toBeTruthy()
  })
})

describe('POST /api/v1/auth/login', () => {
  it('returns tokens with valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: testUser.email, password: testUser.password },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.accessToken).toBeTruthy()
    expect(body.data.refreshToken).toBeTruthy()
  })

  it('returns 401 with wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: testUser.email, password: 'wrongpassword' },
    })

    expect(res.statusCode).toBe(401)
    const body = res.json()
    expect(body.error.code).toBe('INVALID_CREDENTIALS')
  })
})

describe('POST /api/v1/auth/otp/request', () => {
  it('returns 200 with expiresAt', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { phone: '+15551234567' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.expiresAt).toBeTruthy()
  })
})

describe('POST /api/v1/auth/otp/verify', () => {
  it('verifies with correct code', async () => {
    const phone = '+15559876543'

    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { phone },
    })

    const reqBody = reqRes.json()

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { phone, code: reqBody.data.code },
    })

    expect(verifyRes.statusCode).toBe(200)
    const body = verifyRes.json()
    expect(body.data.accessToken).toBeTruthy()
    expect(body.data.refreshToken).toBeTruthy()
  })
})

describe('POST /api/v1/auth/refresh', () => {
  it('rotates refresh token', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: testUser.email, password: testUser.password },
    })

    const refreshToken = loginRes.json().data.refreshToken

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    })

    expect(refreshRes.statusCode).toBe(200)
    const body = refreshRes.json()
    expect(body.data.accessToken).toBeTruthy()
    expect(body.data.refreshToken).not.toBe(refreshToken)

    const reuseRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    })

    expect(reuseRes.statusCode).toBe(401)
  })
})

describe('POST /api/v1/auth/logout', () => {
  it('revokes session', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: testUser.email, password: testUser.password },
    })

    const { accessToken, refreshToken } = loginRes.json().data

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { refreshToken },
    })

    expect(logoutRes.statusCode).toBe(200)
    expect(logoutRes.json().data.ok).toBe(true)
  })
})

describe('GET /api/v1/users/me', () => {
  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
    })

    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHORIZED')
  })
})
