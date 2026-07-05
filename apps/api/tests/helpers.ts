import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createDb, type Db } from '@fintivi/db'

const MIGRATIONS_DIR = new URL('../../../packages/db/migrations', import.meta.url).pathname

export function createTestDb(): { db: Db; close: () => Promise<void>; cleanup: () => void } {
  const tmpDir = mkdtempSync(join(tmpdir(), 'fintivi-test-'))
  const dbPath = join(tmpDir, 'test.db')
  const { db, close } = createDb(`file:${dbPath}`)

  return { db, close, cleanup: () => { rmSync(tmpDir, { recursive: true, force: true }) } }
}

export async function migrateTestDb(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR })
}
