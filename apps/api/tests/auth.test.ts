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
  await db.execute(sql`TRUNCATE TABLE otp_attempts, audit_logs, sessions, auth_identities, users RESTART IDENTITY CASCADE`)
  app = buildApp({ db })
})

afterAll(async () => {
  await db.execute(sql`TRUNCATE TABLE otp_attempts, audit_logs, sessions, auth_identities, users RESTART IDENTITY CASCADE`)
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

  it('verifies the latest OTP when multiple codes are pending', async () => {
    const phone = '+15551234568'
    const firstReq = await app.inject({ method: 'POST', url: '/api/v1/auth/otp/request', payload: { phone } })
    const secondReq = await app.inject({ method: 'POST', url: '/api/v1/auth/otp/request', payload: { phone } })

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { phone, code: secondReq.json().data.code },
    })

    expect(firstReq.statusCode).toBe(200)
    expect(verifyRes.statusCode).toBe(200)
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

  it('creates India-localized user and token when market is india', async () => {
    const phone = '+15559876544'

    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { phone },
    })

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { phone, code: reqRes.json().data.code, market: 'india' },
    })

    expect(verifyRes.statusCode).toBe(200)
    const body = verifyRes.json()
    const decoded = app.jwt.decode<{ market: string }>(body.data.accessToken)
    expect(decoded?.market).toBe('india')
  })

  it('keeps the persisted user market when an existing OTP user verifies with a different market', async () => {
    const phone = '+15559876545'
    const firstReq = await app.inject({ method: 'POST', url: '/api/v1/auth/otp/request', payload: { phone } })
    const firstVerify = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { phone, code: firstReq.json().data.code, market: 'india' },
    })
    expect(firstVerify.statusCode).toBe(200)

    const secondReq = await app.inject({ method: 'POST', url: '/api/v1/auth/otp/request', payload: { phone } })
    const secondVerify = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { phone, code: secondReq.json().data.code, market: 'global' },
    })

    expect(secondVerify.statusCode).toBe(200)
    const decoded = app.jwt.decode<{ market: string }>(secondVerify.json().data.accessToken)
    expect(decoded?.market).toBe('india')
  })

  it('rejects invalid OTP market values', async () => {
    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/request',
      payload: { phone: '+15559876546' },
    })

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { phone: '+15559876546', code: reqRes.json().data.code, market: 'europe' },
    })

    expect(verifyRes.statusCode).toBe(400)
    expect(verifyRes.json().error.code).toBe('VALIDATION_ERROR')
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

  it('allows 30 refresh attempts per user per hour and rejects the 31st', async () => {
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'refresh-limit@example.com', password: 'TestPass123!', market: 'global', locale: 'en', currency: 'USD' },
    })
    expect(signupRes.statusCode).toBe(201)

    let refreshToken = signupRes.json().data.refreshToken
    for (let i = 0; i < 30; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      })
      expect(res.statusCode).toBe(200)
      refreshToken = res.json().data.refreshToken
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    })
    expect(blocked.statusCode).toBe(429)
  })

  it('counts repeated reuse attempts against the refresh limit', async () => {
    const signupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'refresh-reuse-limit@example.com', password: 'TestPass123!', market: 'global', locale: 'en', currency: 'USD' },
    })
    expect(signupRes.statusCode).toBe(201)

    const oldRefreshToken = signupRes.json().data.refreshToken
    const firstRefresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: oldRefreshToken },
    })
    expect(firstRefresh.statusCode).toBe(200)

    for (let i = 0; i < 29; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: oldRefreshToken },
      })
      expect(res.statusCode).toBe(401)
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: oldRefreshToken },
    })
    expect(blocked.statusCode).toBe(429)
  })

  it('preserves India market in refreshed access tokens', async () => {
    const phone = '+15559876547'
    const otpRes = await app.inject({ method: 'POST', url: '/api/v1/auth/otp/request', payload: { phone } })
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: { phone, code: otpRes.json().data.code, market: 'india' },
    })
    expect(verifyRes.statusCode).toBe(200)

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: verifyRes.json().data.refreshToken },
    })

    expect(refreshRes.statusCode).toBe(200)
    const decoded = app.jwt.decode<{ market: string }>(refreshRes.json().data.accessToken)
    expect(decoded?.market).toBe('india')
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
