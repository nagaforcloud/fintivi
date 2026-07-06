import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:../../data/fintivi.db',
    // 'file:../../data/fintivi.db' is relative to packages/db/, resolves to project-root data/
  },
  strict: true,
  verbose: true,
} satisfies Config;
