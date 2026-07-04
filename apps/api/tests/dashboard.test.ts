import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createDb } from '@fintivi/db'
import { users, accounts, transactions, categories, uploadJobs } from '@fintivi/db/schema'
import { sql } from 'drizzle-orm'
import { buildApp } from '../src/server.js'

const dbUrl = process.env.DATABASE_URL!
let app: ReturnType<typeof buildApp>
let db: ReturnType<typeof createDb>['db']
let close: () => Promise<void>

interface TestUser {
  id: string
  token: string
}

let userA: TestUser
let userB: TestUser
let acctAId: string
let catIncomeId: string
let catExpenseId: string

const RANGE_FROM = '2024-06-01'
const RANGE_TO = '2024-06-30'

beforeAll(async () => {
  const connection = createDb(dbUrl)
  db = connection.db
  close = connection.close

  app = buildApp({ db })
  await app.ready()

  const [uA] = await db.insert(users).values({
    email: 'dash-a@test.com',
    market: 'global',
    locale: 'en',
    currency: 'USD',
  }).returning()
  userA = { id: uA!.id, token: app.signAccessToken({ id: uA!.id, market: 'global' }) }

  const [uB] = await db.insert(users).values({
    email: 'dash-b@test.com',
    market: 'global',
    locale: 'en',
    currency: 'EUR',
  }).returning()
  userB = { id: uB!.id, token: app.signAccessToken({ id: uB!.id, market: 'global' }) }

  const [acct] = await db.insert(accounts).values({
    userId: userA.id,
    name: "User A Checking",
    type: 'checking',
    bank: 'Test',
    currency: 'USD',
    balanceMinor: 50000,
  }).returning()
  acctAId = acct!.id

  const [catInc] = await db.insert(categories).values({
    name: 'Salary',
    type: 'income',
  }).returning()
  catIncomeId = catInc!.id

  const [catExp] = await db.insert(categories).values({
    name: 'Food',
    type: 'expense',
  }).returning()
  catExpenseId = catExp!.id

  await db.insert(transactions).values({
    userId: userA.id,
    accountId: acctAId,
    postedAt: '2024-06-15',
    description: 'Salary deposit',
    amountMinor: 500000,
    currency: 'USD',
    categoryId: catIncomeId,
  })

  await db.insert(transactions).values({
    userId: userA.id,
    accountId: acctAId,
    postedAt: '2024-06-16',
    description: 'Groceries',
    amountMinor: -25000,
    currency: 'USD',
    categoryId: catExpenseId,
  })

  await db.insert(transactions).values({
    userId: userA.id,
    accountId: acctAId,
    postedAt: '2024-06-17',
    description: 'Restaurant',
    amountMinor: -15000,
    currency: 'USD',
    categoryId: catExpenseId,
  })

  await db.insert(uploadJobs).values({
    userId: userA.id,
    fileName: 'test.csv',
    fileSize: 1000,
    mime: 'text/csv',
    status: 'completed',
  })

  await db.insert(uploadJobs).values({
    userId: userA.id,
    fileName: 'pending.csv',
    fileSize: 500,
    mime: 'text/csv',
    status: 'preview_ready',
  })

  await db.insert(uploadJobs).values({
    userId: userA.id,
    fileName: 'failed.csv',
    fileSize: 200,
    mime: 'text/csv',
    status: 'failed',
  })
})

afterAll(async () => {
  await db.execute(sql`TRUNCATE TABLE
    transaction_splits, transactions, accounts, categories, upload_jobs,
    category_rules, audit_logs, sessions, auth_identities, users RESTART IDENTITY CASCADE`)
  await app.close()
  await close()
})

describe('GET /api/v1/dashboard - empty returns zero', () => {
  it('returns zero totals and empty arrays for a user with no data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/dashboard?from=${RANGE_FROM}&to=${RANGE_TO}`,
      headers: { authorization: `Bearer ${userB.token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.cashflow.incomeMinor).toBe(0)
    expect(body.data.cashflow.expenseMinor).toBe(0)
    expect(body.data.cashflow.netMinor).toBe(0)
    expect(body.data.accounts).toEqual([])
    expect(body.data.recentTransactions).toEqual([])
    expect(body.data.categoryBreakdown).toEqual([])
    expect(body.data.dataHealth.lastUploadAt).toBeNull()
    expect(body.data.dataHealth.pendingReviewCount).toBe(0)
    expect(body.data.dataHealth.failedUploadCount).toBe(0)
  })
})

describe('GET /api/v1/dashboard - with data', () => {
  it('returns income, expense, net, accounts, transactions, breakdown, and health', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/dashboard?from=${RANGE_FROM}&to=${RANGE_TO}`,
      headers: { authorization: `Bearer ${userA.token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()

    expect(body.data.range.from).toBe(RANGE_FROM)
    expect(body.data.range.to).toBe(RANGE_TO)

    expect(body.data.cashflow.incomeMinor).toBe(500000)
    expect(body.data.cashflow.expenseMinor).toBe(40000)
    expect(body.data.cashflow.netMinor).toBe(460000)

    expect(body.data.accounts.length).toBe(1)
    expect(body.data.accounts[0].name).toBe("User A Checking")
    expect(body.data.accounts[0].balanceMinor).toBe(50000)

    expect(body.data.recentTransactions.length).toBeGreaterThanOrEqual(3)
    expect(body.data.recentTransactions[0].description).toBe('Restaurant')

    expect(body.data.categoryBreakdown.length).toBe(2)
    const salary = body.data.categoryBreakdown.find((c: { categoryName: string }) => c.categoryName === 'Salary')
    const food = body.data.categoryBreakdown.find((c: { categoryName: string }) => c.categoryName === 'Food')
    expect(salary).toBeDefined()
    expect(salary.amountMinor).toBe(500000)
    expect(salary.type).toBe('income')
    expect(food).toBeDefined()
    expect(food.amountMinor).toBe(40000)
    expect(food.type).toBe('expense')

    expect(body.data.dataHealth.lastUploadAt).not.toBeNull()
    expect(body.data.dataHealth.pendingReviewCount).toBe(1)
    expect(body.data.dataHealth.failedUploadCount).toBe(1)
  })
})

describe('GET /api/v1/dashboard - user isolation', () => {
  it('user A cannot see user B dashboard data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/dashboard?from=${RANGE_FROM}&to=${RANGE_TO}`,
      headers: { authorization: `Bearer ${userB.token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.cashflow.incomeMinor).toBe(0)
    expect(body.data.cashflow.expenseMinor).toBe(0)
    expect(body.data.cashflow.netMinor).toBe(0)
    expect(body.data.recentTransactions).toEqual([])
  })
})

describe('GET /api/v1/dashboard - respects user currency', () => {
  it('returns EUR currency from user B preferences', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/dashboard?from=${RANGE_FROM}&to=${RANGE_TO}`,
      headers: { authorization: `Bearer ${userB.token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.currency).toBe('EUR')
  })
})
