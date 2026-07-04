import { auditLogs } from '@fintivi/db/schema'
import type { Db } from '@fintivi/db/client'

export async function writeAuditLog(
  db: Db,
  userId: string,
  action: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
): Promise<void> {
  await db.insert(auditLogs).values({
    userId,
    action,
    details: details ?? null,
    ipAddress: ipAddress ?? null,
  })
}
