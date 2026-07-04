import { and, eq, gte, lte, desc, sum, sql, count, isNotNull } from 'drizzle-orm'
import { transactions, accounts, categories, uploadJobs, users } from '@fintivi/db/schema'
import type { Db } from '@fintivi/db'

export interface DashboardSummary {
  range: { from: string; to: string }
  currency: string
  cashflow: { incomeMinor: number; expenseMinor: number; netMinor: number }
  accounts: Array<{ id: string; name: string; balanceMinor: number; type: string }>
  recentTransactions: Array<{ id: string; postedAt: string; description: string; amountMinor: number; accountName: string }>
  categoryBreakdown: Array<{ categoryName: string; amountMinor: number; percentage: number; type: string }>
  dataHealth: {
    lastUploadAt: string | null
    pendingReviewCount: number
    failedUploadCount: number
  }
}

export async function getDashboardSummary(
  db: Db,
  userId: string,
  options?: { from?: Date; to?: Date },
): Promise<DashboardSummary> {
  const now = new Date()
  const from = options?.from ?? new Date(now.getFullYear(), now.getMonth(), 1)
  const to = options?.to ?? new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const fromStr = from.toISOString().split('T')[0]!
  const toStr = to.toISOString().split('T')[0]!

  const dateConditions = [
    eq(transactions.userId, userId),
    gte(transactions.postedAt, fromStr),
    lte(transactions.postedAt, toStr),
  ]

  const [
    userCur,
    cashflowResult,
    accountList,
    recent,
    catBreakdownResult,
    lastUploadResult,
    pendingCountResult,
    failedCountResult,
  ] = await Promise.all([
    db.select({ currency: users.currency })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then(r => r[0]?.currency ?? 'USD'),

    db.select({
      income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amountMinor} > 0 THEN ${transactions.amountMinor} ELSE 0 END), 0)`,
      expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amountMinor} < 0 THEN ${transactions.amountMinor} ELSE 0 END), 0)`,
    })
      .from(transactions)
      .where(and(...dateConditions))
      .then(r => r[0] ?? { income: 0, expense: 0 }),

    db.select({
      id: accounts.id,
      name: accounts.name,
      balanceMinor: accounts.balanceMinor,
      type: accounts.type,
    })
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(accounts.name),

    db.select({
      id: transactions.id,
      postedAt: transactions.postedAt,
      description: transactions.description,
      amountMinor: transactions.amountMinor,
      accountName: sql<string>`COALESCE(${accounts.name}, '')`,
    })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.postedAt), desc(transactions.id))
      .limit(10),

    db.select({
      categoryName: categories.name,
      type: categories.type,
      amountMinor: sum(transactions.amountMinor),
    })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...dateConditions, isNotNull(transactions.categoryId)))
      .groupBy(transactions.categoryId, categories.name, categories.type),

    db.select({ lastUploadAt: uploadJobs.createdAt })
      .from(uploadJobs)
      .where(eq(uploadJobs.userId, userId))
      .orderBy(desc(uploadJobs.createdAt))
      .limit(1)
      .then(r => r[0]?.lastUploadAt ?? null),

    db.select({ count: count() })
      .from(uploadJobs)
      .where(and(eq(uploadJobs.userId, userId), eq(uploadJobs.status, 'preview_ready')))
      .then(r => r[0]?.count ?? 0),

    db.select({ count: count() })
      .from(uploadJobs)
      .where(and(eq(uploadJobs.userId, userId), eq(uploadJobs.status, 'failed')))
      .then(r => r[0]?.count ?? 0),
  ])

  const incomeMinor = Number(cashflowResult.income) || 0
  const expenseRaw = Number(cashflowResult.expense) || 0
  const expenseMinor = Math.abs(expenseRaw)
  const netMinor = incomeMinor - expenseMinor

  const catBreakdown = catBreakdownResult.map((row) => {
    const total = row.type === 'income' ? incomeMinor : expenseMinor
    const amount = Math.abs(Number(row.amountMinor) || 0)
    const percentage = total > 0 ? Math.round((amount / total) * 10000) / 100 : 0
    return {
      categoryName: row.categoryName ?? 'Uncategorized',
      amountMinor: amount,
      percentage,
      type: row.type ?? 'expense',
    }
  })

  return {
    range: { from: fromStr, to: toStr },
    currency: userCur,
    cashflow: { incomeMinor, expenseMinor, netMinor },
    accounts: accountList ?? [],
    recentTransactions: recent ?? [],
    categoryBreakdown: catBreakdown,
    dataHealth: {
      lastUploadAt: lastUploadResult instanceof Date ? lastUploadResult.toISOString() : lastUploadResult,
      pendingReviewCount: pendingCountResult,
      failedUploadCount: failedCountResult,
    },
  }
}
