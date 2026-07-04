import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: 'postgres://fintivi:fintivi@localhost:5432/fintivi',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      REFRESH_TOKEN_SECRET: 'b'.repeat(32),
      PHONE_HASH_PEPPER: 'c'.repeat(16),
      OTP_PROVIDER: 'test',
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      GOOGLE_REDIRECT_URI: 'http://localhost:8001/api/v1/auth/google/callback',
      NODE_ENV: 'test',
    },
  },
})
