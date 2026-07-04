import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://fintivi:fintivi@localhost:5432/fintivi',
  },
  strict: true,
  verbose: true,
} satisfies Config;
