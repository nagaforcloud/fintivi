import { describe, it, expect } from 'vitest'
import { parseEnv } from '../src/env.js'

describe('environment validation', () => {
  it.each([
    ['JWT_ACCESS_SECRET', 'change-me-to-a-random-64-char-string'],
    ['REFRESH_TOKEN_SECRET', 'change-me-to-another-random-64-char-string'],
    ['PHONE_HASH_PEPPER', 'change-me-pepper-16'],
  ])('rejects %s placeholder in production', (key, placeholder) => {
    const env = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://fintivi:fintivi@localhost:5432/fintivi',
      JWT_ACCESS_SECRET: 'a'.repeat(64),
      REFRESH_TOKEN_SECRET: 'b'.repeat(64),
      PHONE_HASH_PEPPER: 'c'.repeat(32),
      OTP_PROVIDER: 'twilio',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:8001/api/v1/auth/google/callback',
    }

    expect(() => parseEnv({ ...env, [key]: placeholder })).toThrow()
  })

  it('rejects test OTP provider in production', async () => {
    expect(() => parseEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://fintivi:fintivi@localhost:5432/fintivi',
      JWT_ACCESS_SECRET: 'a'.repeat(64),
      REFRESH_TOKEN_SECRET: 'b'.repeat(64),
      PHONE_HASH_PEPPER: 'c'.repeat(32),
      OTP_PROVIDER: 'test',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:8001/api/v1/auth/google/callback',
    })).toThrow()
  })

  it('accepts non-placeholder production secrets with non-test OTP provider', async () => {
    expect(parseEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://fintivi:fintivi@localhost:5432/fintivi',
      JWT_ACCESS_SECRET: 'a'.repeat(64),
      REFRESH_TOKEN_SECRET: 'b'.repeat(64),
      PHONE_HASH_PEPPER: 'c'.repeat(32),
      OTP_PROVIDER: 'twilio',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:8001/api/v1/auth/google/callback',
    }).NODE_ENV).toBe('production')
  })

  it('defaults web browser integration env values for local development', () => {
    const parsed = parseEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/fintivi',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      REFRESH_TOKEN_SECRET: 'b'.repeat(32),
      PHONE_HASH_PEPPER: 'pepper-pepper-123',
      OTP_PROVIDER: 'test',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:8001/api/v1/auth/google/callback',
      NODE_ENV: 'development',
    })

    expect(parsed.WEB_APP_URL).toBe('http://localhost:5173')
    expect(parsed.CORS_ORIGIN).toBe('http://localhost:5173')
  })
})
