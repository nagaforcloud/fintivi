import { createHash } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { env } from '../env.js'
import {
  createPasswordUser,
  signInWithPassword,
  requestOtp,
  verifyOtpCode,
  createSession,
  refreshSession,
  revokeSession,
  getSessionByTokenHash,
  verifyGoogleToken,
  linkOrCreateGoogleUser,
} from '@fintivi/auth'
import { writeAuditLog } from '../lib/audit.js'
import { requireAuth } from '../middleware/require-auth.js'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email',
    access_type: 'offline',
  })
  return `${GOOGLE_AUTH_URL}?${params}`
}

async function exchangeGoogleCode(code: string): Promise<string | null> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) return null

  const data = (await response.json()) as { id_token?: string }
  return data.id_token ?? null
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/signup', {
    ...(env.NODE_ENV !== 'test' ? { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } } : {}),
  }, async (request, reply) => {
    const { email, password, market, locale, currency } = request.body as {
      email: string
      password: string
      market: 'global' | 'india'
      locale: string
      currency: string
    }

    if (!email || !password) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
      })
    }

    const db = request.server.db
    const ip = request.ip

    const { user, identity } = await createPasswordUser(db, email, password, market, locale, currency)
    const { session, refreshToken } = await createSession(db, user.id, request.headers['user-agent'], ip)
    const accessToken = app.signAccessToken({ id: user.id, market: user.market })

    await writeAuditLog(db, user.id, 'signup', { provider: 'password' }, ip)

    return reply.status(201).send({
      data: {
        user: { id: user.id, email: user.email, market: user.market, locale: user.locale, currency: user.currency },
        accessToken,
        refreshToken,
        sessionId: session.id,
      },
    })
  })

  app.post('/login', {
    ...(env.NODE_ENV !== 'test' ? { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } } : {}),
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }

    if (!email || !password) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
      })
    }

    const db = request.server.db
    const ip = request.ip

    const result = await signInWithPassword(db, email, password)

    if ('error' in result) {
      return reply.status(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      })
    }

    const { user } = result
    const { session, refreshToken } = await createSession(db, user.id, request.headers['user-agent'], ip)
    const accessToken = app.signAccessToken({ id: user.id, market: user.market })

    await writeAuditLog(db, user.id, 'login', {}, ip)

    return reply.send({
      data: {
        user: { id: user.id, email: user.email, market: user.market, locale: user.locale, currency: user.currency },
        accessToken,
        refreshToken,
        sessionId: session.id,
      },
    })
  })

  app.post('/otp/request', {
    ...(env.NODE_ENV !== 'test' ? { config: { rateLimit: { max: 3, timeWindow: '15 minutes' } } } : {}),
  }, async (request, reply) => {
    const { phone } = request.body as { phone: string }

    if (!phone) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Phone is required' },
      })
    }

    const db = request.server.db
    const ip = request.ip

    const result = await requestOtp(db, phone, ip)

    if (!result.ok) {
      return reply.status(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many OTP requests' },
      })
    }

    return reply.send({
      data: { expiresAt: result.expiresAt, ...(result.code ? { code: result.code } : {}) },
    })
  })

  app.post('/otp/verify', {
    ...(env.NODE_ENV !== 'test' ? { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } } : {}),
  }, async (request, reply) => {
    const { phone, code } = request.body as { phone: string; code: string }

    if (!phone || !code) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Phone and code are required' },
      })
    }

    const db = request.server.db
    const ip = request.ip

    const result = await verifyOtpCode(db, phone, code)

    if (!result.ok) {
      return reply.status(401).send({
        error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP' },
      })
    }

    const { session, refreshToken } = await createSession(db, result.userId, request.headers['user-agent'], ip)
    const accessToken = app.signAccessToken({ id: result.userId, market: 'global' })

    await writeAuditLog(db, result.userId, 'otp_verify', {}, ip)

    return reply.send({
      data: {
        userId: result.userId,
        accessToken,
        refreshToken,
        sessionId: session.id,
      },
    })
  })

  app.get('/google/start', async (_request, reply) => {
    return reply.redirect(302, getGoogleAuthUrl())
  })

  app.get('/google/callback', async (request, reply) => {
    const { code } = request.query as { code?: string }

    if (!code) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Authorization code is required' },
      })
    }

    const db = request.server.db
    const ip = request.ip

    const idToken = await exchangeGoogleCode(code)
    if (!idToken) {
      return reply.status(401).send({
        error: { code: 'GOOGLE_AUTH_FAILED', message: 'Failed to exchange authorization code' },
      })
    }

    const googleUser = await verifyGoogleToken(idToken, env.GOOGLE_CLIENT_ID)
    if (!googleUser) {
      return reply.status(401).send({
        error: { code: 'GOOGLE_AUTH_FAILED', message: 'Invalid Google ID token' },
      })
    }

    const { user, identity } = await linkOrCreateGoogleUser(
      db, googleUser.sub, googleUser.email, 'global', 'en', 'USD',
    )

    const { session, refreshToken } = await createSession(db, user.id, request.headers['user-agent'], ip)
    const accessToken = app.signAccessToken({ id: user.id, market: user.market })

    await writeAuditLog(db, user.id, 'google_link', { googleSub: googleUser.sub }, ip)

    return reply.send({
      data: {
        user: { id: user.id, email: user.email, market: user.market },
        accessToken,
        refreshToken,
        sessionId: session.id,
      },
    })
  })

  app.post('/refresh', async (request, reply) => {
    const { refreshToken: token } = request.body as { refreshToken?: string }

    if (!token) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Refresh token is required' },
      })
    }

    const db = request.server.db

    const result = await refreshSession(db, token)

    if ('error' in result) {
      const code = result.error === 'reused' ? 'TOKEN_REUSED' : 'TOKEN_EXPIRED'

      return reply.status(401).send({
        error: { code, message: 'Invalid or expired refresh token' },
      })
    }

    const accessToken = app.signAccessToken({
      id: result.session.userId,
      market: 'global',
    })

    return reply.send({
      data: {
        accessToken,
        refreshToken: result.refreshToken,
        sessionId: result.session.id,
      },
    })
  })

  app.post('/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    const { refreshToken: token } = request.body as { refreshToken?: string }
    const db = request.server.db
    const userId = request.user.id

    if (token) {
      const tokenHash = createHash('sha256').update(token).digest('hex')
      const session = await getSessionByTokenHash(db, tokenHash)
      if (session && session.userId === userId) {
        await revokeSession(db, session.id)
      }
    }

    await writeAuditLog(db, userId, 'logout', {}, request.ip)

    return reply.send({ data: { ok: true } })
  })
}
