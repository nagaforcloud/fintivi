import { createHmac } from 'node:crypto'
import { auditLogs } from '@fintivi/db/schema'
import type { Db } from '@fintivi/db/client'
import { env } from '../env.js'

const DETAIL_ALLOWLIST: Record<string, Set<string>> = {
  signup: new Set(['provider']),
  account_create: new Set(['accountId']),
  account_update: new Set(['accountId', 'updates']),
  account_delete: new Set(['accountId']),
  category_rule_create: new Set(['ruleId', 'categoryId']),
  category_rule_update: new Set(['ruleId', 'updates']),
  category_rule_delete: new Set(['ruleId']),
  transaction_update: new Set(['transactionId', 'categoryId']),
  transaction_split: new Set(['transactionId', 'splitCount']),
  transaction_delete: new Set(['transactionId']),
  upload_create: new Set(['jobId']),
  upload_failure: new Set(['jobId']),
  upload_confirm: new Set(['jobId', 'accountId', 'imported', 'skipped', 'duplicates']),
  refresh_attempt: new Set(['sessionId']),
}

function hashIp(ipAddress: string): string {
  return createHmac('sha256', env.PHONE_HASH_PEPPER).update(ipAddress).digest('hex')
}

function sanitizeDetails(action: string, details?: Record<string, unknown>): Record<string, unknown> | null {
  if (!details) return null

  const allowed = DETAIL_ALLOWLIST[action]
  if (!allowed) return null

  const sanitized: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in details) sanitized[key] = details[key]
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null
}

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
    details: JSON.stringify(sanitizeDetails(action, details)) as never,
    ipAddress: ipAddress ? hashIp(ipAddress) : null,
  })
}
