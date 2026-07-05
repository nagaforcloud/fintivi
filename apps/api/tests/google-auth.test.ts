import { describe, it, expect, vi, beforeEach } from 'vitest'

const authMocks = vi.hoisted(() => ({
  createPasswordUser: vi.fn(),
  signInWithPassword: vi.fn(),
  requestOtp: vi.fn(),
  verifyOtpCode: vi.fn(),
  createSession: vi.fn(),
  refreshSession: vi.fn(),
  revokeSession: vi.fn(),
  getSessionByTokenHash: vi.fn(),
  verifyGoogleToken: vi.fn(),
  linkOrCreateGoogleUser: vi.fn(),
}))

vi.mock('@fintivi/auth', () => authMocks)

const { buildApp } = await import('../src/server.js')

describe('Google OAuth callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id_token: 'id-token' }),
    })) as never
  })

  it('rejects Google users with unverified email addresses', async () => {
    authMocks.verifyGoogleToken.mockResolvedValue({
      sub: 'google-sub',
      email: 'unverified@example.com',
      emailVerified: false,
    })

    const app = buildApp({
      db: {
        execute: async () => [{ ok: 1 }],
      } as never,
    })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/google/callback?code=abc',
    })

    expect(response.statusCode).toBe(401)
    expect(authMocks.linkOrCreateGoogleUser).not.toHaveBeenCalled()
    await app.close()
  })

  it('redirects to web app with fragment tokens on successful Google callback', async () => {
    authMocks.verifyGoogleToken.mockResolvedValue({
      sub: 'google-sub',
      email: 'user@example.com',
      emailVerified: true,
    })

    authMocks.linkOrCreateGoogleUser.mockResolvedValue({
      user: { id: 'user-id', email: 'user@example.com', market: 'global' },
      identity: { id: 'identity-id' },
    })

    authMocks.createSession.mockResolvedValue({
      session: { id: 'session-id' },
      refreshToken: 'refresh-token',
    })

    const app = buildApp({
      db: {
        execute: async () => [{ ok: 1 }],
        insert: () => ({ values: async () => {} }),
        select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([{ userId: 'user-id', count: 0 }]) }) }) }),
      } as never,
    })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/google/callback?code=ok',
    })

    expect(response.statusCode).toBe(302)
    const location = response.headers.location as string
    expect(location).toContain('http://localhost:5173/auth/google/callback#')
    expect(location).toContain('accessToken=')
    expect(location).toContain('refreshToken=')
    expect(location).toContain('sessionId=')
    expect(location).toContain('userId=')
    expect(location).toContain('email=')
    expect(location).toContain('market=global')
    await app.close()
  })
})
