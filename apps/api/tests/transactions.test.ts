import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { users, accounts, transactions, categories } from '@fintivi/db/schema'
import type { Db } from '@fintivi/db/client'
import { buildApp } from '../src/server.js'
import { createTestDb, migrateTestDb } from './helpers'

let app: ReturnType<typeof buildApp>
let db: Db
let close: () => Promise<void>

interface TestUser {
  id: string
  token: string
}

let userA: TestUser
let userB: TestUser
let acctAId: string
let acctBId: string
let catId: string
let txnAIds: string[]

async function createTestUser(email: string): Promise<TestUser> {
  const [usr] = await db.insert(users).values({
    email,
    market: 'global',
    locale: 'en',
    currency: 'USD',
  }).returning()
  const token = app.signAccessToken({ id: usr!.id, market: 'global' })
  return { id: usr!.id, token }
}

async function createTestAccount(userId: string, name: string): Promise<string> {
  const [acct] = await db.insert(accounts).values({
    userId,
    name,
    type: 'checking',
    bank: 'Test',
    currency: 'USD',
  }).returning()
  return acct!.id
}

beforeAll(async () => {
  const testDb = createTestDb()
  db = testDb.db
  close = testDb.close
  await migrateTestDb(db)

  app = buildApp({ db })
  await app.ready()

  userA = await createTestUser('txn-a@test.com')
  userB = await createTestUser('txn-b@test.com')

  acctAId = await createTestAccount(userA.id, "User A's Account")
  acctBId = await createTestAccount(userB.id, "User B's Account")

  const [cat] = await db.insert(categories).values({
    name: 'Food',
    type: 'expense',
    color: '#ff0000',
    icon: '🍔',
  }).returning()
  catId = cat!.id

  txnAIds = []
  for (let i = 0; i < 5; i++) {
    const [txn] = await db.insert(transactions).values({
      userId: userA.id,
      accountId: acctAId,
      postedAt: `2024-01-${String(i + 1).padStart(2, '0')}`,
      description: i === 0 ? `Coffee shop #${i}` : `Transaction #${i}`,
      amountMinor: (i + 1) * 1000,
      categoryId: i === 0 ? catId : null,
      currency: 'USD',
    }).returning()
    txnAIds.push(txn!.id)
  }
})

afterAll(async () => {
  await app.close()
  await close()
})

describe('POST /api/v1/accounts', () => {
  it('creates an account for the authenticated user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/accounts',
      headers: { authorization: `Bearer ${userA.token}` },
      payload: { name: 'New Account', type: 'savings', bank: 'My Bank', currency: 'EUR' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.name).toBe('New Account')
    expect(body.data.userId).toBe(userA.id)
    expect(body.data.type).toBe('savings')
  })
})

describe('GET /api/v1/accounts', () => {
  it('lists only the user own accounts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/accounts',
      headers: { authorization: `Bearer ${userA.token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    for (const acct of body.data) {
      expect(acct.userId).toBe(userA.id)
    }
  })
})

describe('PATCH /api/v1/accounts/:id', () => {
  it('updates own account', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/accounts/${acctAId}`,
      headers: { authorization: `Bearer ${userA.token}` },
      payload: { name: 'Updated Name' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.name).toBe('Updated Name')
  })

  it('returns 404 for another user account', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/accounts/${acctAId}`,
      headers: { authorization: `Bearer ${userB.token}` },
      payload: { name: 'Hacked' },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/v1/accounts/:id', () => {
  it('deletes own account', async () => {
    const [tmpAcct] = await db.insert(accounts).values({
      userId: userA.id,
      name: 'Temp',
      type: 'checking',
    }).returning()

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/accounts/${tmpAcct!.id}`,
      headers: { authorization: `Bearer ${userA.token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.ok).toBe(true)
  })

  it('returns 404 for another user account', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/accounts/${acctAId}`,
      headers: { authorization: `Bearer ${userB.token}` },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('GET /api/v1/transactions', () => {
  it('returns paginated transactions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/transactions?page=1&perPage=2',
      headers: { authorization: `Bearer ${userA.token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBe(2)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.perPage).toBe(2)
    expect(body.pagination.total).toBeGreaterThanOrEqual(5)
  })

  it('filters by accountId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/transactions?accountId=${acctAId}`,
      headers: { authorization: `Bearer ${userA.token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    for (const txn of body.data) {
      expect(txn.accountId).toBe(acctAId)
    }
  })

  it('filters by categoryId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/transactions?categoryId=${catId}`,
      headers: { authorization: `Bearer ${userA.token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    for (const txn of body.data) {
      expect(txn.categoryId).toBe(catId)
    }
  })

  it('filters by date range', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/transactions?dateFrom=2024-01-01&dateTo=2024-01-03',
      headers: { authorization: `Bearer ${userA.token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    for (const txn of body.data) {
      expect(txn.postedAt >= '2024-01-01').toBe(true)
      expect(txn.postedAt <= '2024-01-03').toBe(true)
    }
  })

  it('filters by search', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/transactions?search=Coffee',
      headers: { authorization: `Bearer ${userA.token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.length).toBeGreaterThanOrEqual(1)
    for (const txn of body.data) {
      expect(txn.description.toLowerCase()).toContain('coffee')
    }
  })

  it('returns empty for another user transactions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/transactions',
      headers: { authorization: `Bearer ${userB.token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.length).toBe(0)
  })
})

describe('GET /api/v1/transactions/:id', () => {
  it('returns own transaction', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/transactions/${txnAIds[0]}`,
      headers: { authorization: `Bearer ${userA.token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.id).toBe(txnAIds[0])
  })

  it('returns 404 for another user transaction', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/transactions/${txnAIds[0]}`,
      headers: { authorization: `Bearer ${userB.token}` },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /api/v1/transactions/:id', () => {
  it('updates category and notes for owner', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/transactions/${txnAIds[1]}`,
      headers: { authorization: `Bearer ${userA.token}` },
      payload: { categoryId: catId, notes: 'Test note' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.categoryId).toBe(catId)
    expect(body.data.notes).toBe('Test note')
  })

  it('returns 404 for another user transaction', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/transactions/${txnAIds[1]}`,
      headers: { authorization: `Bearer ${userB.token}` },
      payload: { notes: 'Hacked' },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('POST /api/v1/transactions/:id/split', () => {
  it('validates split sum equals original amount', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/transactions/${txnAIds[2]}/split`,
      headers: { authorization: `Bearer ${userA.token}` },
      payload: { splits: [{ amountMinor: 1500, description: 'Part 1' }, { amountMinor: 1500, description: 'Part 2' }] },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.length).toBe(2)
  })

  it('rejects split sum that does not match', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/transactions/${txnAIds[4]}/split`,
      headers: { authorization: `Bearer ${userA.token}` },
      payload: { splits: [{ amountMinor: 100, description: 'Small' }] },
    })

    expect(res.statusCode).toBe(400)
  })

  it('requires at least 2 splits', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/transactions/${txnAIds[4]}/split`,
      headers: { authorization: `Bearer ${userA.token}` },
      payload: { splits: [{ amountMinor: 5000, description: 'Only one' }] },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for another user transaction', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/transactions/${txnAIds[2]}/split`,
      headers: { authorization: `Bearer ${userB.token}` },
      payload: { splits: [{ amountMinor: 1500, description: 'Part 1' }, { amountMinor: 1500, description: 'Part 2' }] },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/v1/transactions/:id', () => {
  it('deletes own transaction', async () => {
    const [txn] = await db.insert(transactions).values({
      userId: userA.id,
      accountId: acctAId,
      postedAt: '2024-01-10',
      description: 'To delete',
      amountMinor: 5000,
    }).returning()

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/transactions/${txn!.id}`,
      headers: { authorization: `Bearer ${userA.token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.ok).toBe(true)
  })

  it('returns 404 for another user transaction', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/transactions/${txnAIds[3]}`,
      headers: { authorization: `Bearer ${userB.token}` },
    })

    expect(res.statusCode).toBe(404)
  })
})
