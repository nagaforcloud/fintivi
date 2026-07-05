import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { users, categories, categoryRules } from '@fintivi/db/schema'
import type { Db } from '@fintivi/db/client'
import { buildApp } from '../src/server.js'
import { createTestDb, migrateTestDb } from './helpers'

let app: ReturnType<typeof buildApp>
let db: Db
let close: () => Promise<void>

let userAId: string
let userBId: string
let tokenA: string
let tokenB: string
let systemCatId: string
let userCatId: string
let ruleId: string

beforeAll(async () => {
  const testDb = createTestDb()
  db = testDb.db
  close = testDb.close
  await migrateTestDb(db)

  app = buildApp({ db })
  await app.ready()

  const [userA] = await db.insert(users).values({
    email: 'cat-a@test.com',
    market: 'global',
    locale: 'en',
    currency: 'USD',
  }).returning()

  const [userB] = await db.insert(users).values({
    email: 'cat-b@test.com',
    market: 'global',
    locale: 'en',
    currency: 'USD',
  }).returning()

  userAId = userA!.id
  userBId = userB!.id
  tokenA = app.signAccessToken({ id: userAId, market: 'global' })
  tokenB = app.signAccessToken({ id: userBId, market: 'global' })

  const [sysCat] = await db.insert(categories).values({
    name: 'Salary',
    type: 'income',
    color: '#00ff00',
    icon: '💰',
    isSystem: true,
  }).returning()
  systemCatId = sysCat!.id

  const [usrCat] = await db.insert(categories).values({
    userId: userAId,
    name: 'Freelance',
    type: 'income',
    color: '#0000ff',
    icon: '💻',
    isSystem: false,
  }).returning()
  userCatId = usrCat!.id
})

afterAll(async () => {
  await app.close()
  await close()
})

describe('GET /api/v1/categories', () => {
  it('returns system + user categories', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${tokenA}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    const names = body.data.map((c: { name: string }) => c.name)
    expect(names).toContain('Salary')
    expect(names).toContain('Freelance')
  })

  it('does not include other user categories for user B', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${tokenB}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    const names = body.data.map((c: { name: string }) => c.name)
    expect(names).toContain('Salary')
    expect(names).not.toContain('Freelance')
  })
})

describe('POST /api/v1/categories/rules', () => {
  it('creates a category rule', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/categories/rules',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        categoryId: systemCatId,
        pattern: 'salary',
        matchType: 'contains',
        priority: 1,
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.data.categoryId).toBe(systemCatId)
    expect(body.data.pattern).toBe('salary')
    expect(body.data.userId).toBe(userAId)
    ruleId = body.data.id
  })
})

describe('PATCH /api/v1/categories/rules/:id', () => {
  it('updates own rule', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/categories/rules/${ruleId}`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { priority: 5 },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.priority).toBe(5)
  })

  it('returns 404 for another user rule', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/categories/rules/${ruleId}`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { priority: 10 },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/v1/categories/rules/:id', () => {
  it('deletes own rule', async () => {
    const [rule] = await db.insert(categoryRules).values({
      userId: userAId,
      categoryId: systemCatId,
      pattern: 'delete-me',
      matchType: 'contains',
    }).returning()

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/categories/rules/${rule!.id}`,
      headers: { authorization: `Bearer ${tokenA}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.ok).toBe(true)
  })

  it('returns 404 for another user rule', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/categories/rules/${ruleId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    })

    expect(res.statusCode).toBe(404)
  })
})
