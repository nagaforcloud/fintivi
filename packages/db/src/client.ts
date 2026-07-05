import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema/index';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function createDb(dbPath: string): { db: Db; close: () => Promise<void> } {
  const client = createClient({ url: dbPath });
  const db = drizzle(client, { schema });
  return {
    db,
    close: async () => { client.close(); },
  };
}
