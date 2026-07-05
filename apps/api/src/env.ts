import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from project root (two levels up from apps/api/src/)
dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') })

import { z } from 'zod'

const PLACEHOLDER_VALUES = new Set([
  'change-me-to-a-random-64-char-string',
  'change-me-to-another-random-64-char-string',
  'change-me-pepper-16',
])

const envSchema = z.object({
  DATABASE_URL: z.string().default('file:' + resolve(__dirname, '..', '..', '..', 'data', 'fintivi.db')),
  JWT_ACCESS_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  PHONE_HASH_PEPPER: z.string().min(16),
  OTP_PROVIDER: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string(),
  PORT: z.coerce.number().default(8001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  WEB_APP_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV !== 'production') return

  for (const key of ['JWT_ACCESS_SECRET', 'REFRESH_TOKEN_SECRET', 'PHONE_HASH_PEPPER'] as const) {
    if (PLACEHOLDER_VALUES.has(value[key])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} must not use the example placeholder in production`,
      })
    }
  }

  if (value.OTP_PROVIDER === 'test') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['OTP_PROVIDER'],
      message: 'OTP_PROVIDER=test is not allowed in production',
    })
  }
})

export function parseEnv(input: NodeJS.ProcessEnv) {
  return envSchema.parse(input)
}

export const env = parseEnv(process.env)
