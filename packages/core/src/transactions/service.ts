import { and, eq, like, gte, lte, desc, count } from 'drizzle-orm'
import { transactions, transactionSplits } from '@fintivi/db/schema'
import type { Db } from '@fintivi/db'

export interface TransactionFilters {
  accountId?: string
  categoryId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  perPage?: number
}

export async function listTransactions(db: Db, userId: string, filters: TransactionFilters) {
  const page = filters.page ?? 1
  const perPage = filters.perPage ?? 20
  const offset = (page - 1) * perPage

  const conditions = [eq(transactions.userId, userId)]

  if (filters.accountId) {
    conditions.push(eq(transactions.accountId, filters.accountId))
  }
  if (filters.categoryId) {
    conditions.push(eq(transactions.categoryId, filters.categoryId))
  }
  if (filters.dateFrom) {
    conditions.push(gte(transactions.postedAt, filters.dateFrom))
  }
  if (filters.dateTo) {
    conditions.push(lte(transactions.postedAt, filters.dateTo))
  }
  if (filters.search) {
    conditions.push(like(transactions.description, `%${filters.search}%`))
  }

  const where = and(...conditions)

  const [totalResult] = await db.select({ total: count() })
    .from(transactions)
    .where(where)

  const rows = await db.select()
    .from(transactions)
    .where(where)
    .orderBy(desc(transactions.postedAt), desc(transactions.id))
    .limit(perPage)
    .offset(offset)

  return {
    data: rows,
    pagination: {
      page,
      perPage,
      total: totalResult?.total ?? 0,
      totalPages: Math.ceil((totalResult?.total ?? 0) / perPage),
    },
  }
}

export async function getTransaction(db: Db, userId: string, transactionId: string) {
  const [row] = await db.select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function updateTransaction(
  db: Db,
  userId: string,
  transactionId: string,
  data: { categoryId?: string | null; notes?: string | null },
) {
  const [row] = await db.update(transactions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .returning()
  return row ?? null
}

export async function splitTransaction(
  db: Db,
  userId: string,
  transactionId: string,
  splits: Array<{ amountMinor: number; categoryId?: string | null; description?: string | null }>,
) {
  const txn = await getTransaction(db, userId, transactionId)
  if (!txn) return null

  const sum = splits.reduce((acc, s) => acc + s.amountMinor, 0)
  if (sum !== txn.amountMinor) {
    throw new Error(`Split sum ${sum} does not match transaction amount ${txn.amountMinor}`)
  }

  const rows = []
  for (const split of splits) {
    const [row] = await db.insert(transactionSplits).values({
      transactionId,
      amountMinor: split.amountMinor,
      categoryId: split.categoryId ?? null,
      description: split.description ?? null,
    }).returning()
    rows.push(row!)
  }

  return rows
}

export async function deleteTransaction(db: Db, userId: string, transactionId: string) {
  const [row] = await db.delete(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .returning()
  return row ?? null
}
