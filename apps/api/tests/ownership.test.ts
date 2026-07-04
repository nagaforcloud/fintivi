import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { createDb } from '@fintivi/db'
import { users, accounts } from '@fintivi/db/schema'
import { sql } from 'drizzle-orm'
import { buildApp } from '../src/server.js'
import { requireAuth } from '../src/middleware/require-auth.js'
import { requireOwner } from '../src/middleware/require-owner.js'

const dbUrl = process.env.DATABASE_URL!
let app: ReturnType<typeof buildApp>
let db: ReturnType<typeof createDb>['db']
let close: () => Promise<void>

let userAId: string
let userBId: string
let accountAId: string
let accountBId: string
let tokenA: string
let tokenB: string

beforeAll(async () => {
  const connection = createDb(dbUrl)
  db = connection.db
  close = connection.close

  app = buildApp({ db })

  app.get('/api/v2/test/accounts/:id', {
    preHandler: [requireAuth, requireOwner(accounts, 'id')],
  }, async (_request, _reply) => {
    return { data: { ok: true } }
  })

  await app.ready()

  const [userA] = await db.insert(users).values({
    email: 'owner-a@test.com',
    market: 'global',
    locale: 'en',
    currency: 'USD',
  }).returning()

  const [userB] = await db.insert(users).values({
    email: 'owner-b@test.com',
    market: 'global',
    locale: 'en',
    currency: 'USD',
  }).returning()

  userAId = userA!.id
  userBId = userB!.id

  const [acctA] = await db.insert(accounts).values({
    userId: userAId,
    name: "User A's account",
    type: 'checking',
    bank: 'Test',
    currency: 'USD',
  }).returning()

  const [acctB] = await db.insert(accounts).values({
    userId: userBId,
    name: "User B's account",
    type: 'checking',
    bank: 'Test',
    currency: 'USD',
  }).returning()

  accountAId = acctA!.id
  accountBId = acctB!.id

  tokenA = app.signAccessToken({ id: userAId, market: 'global' })
  tokenB = app.signAccessToken({ id: userBId, market: 'global' })
})

afterAll(async () => {
  await db.execute(sql`TRUNCATE TABLE accounts, audit_logs, sessions, auth_identities, users RESTART IDENTITY CASCADE`)
  await app.close()
  await close()
})

describe('requireOwner middleware', () => {
  it('allows user A to access their own account', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/test/accounts/${accountAId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    })

    expect(res.statusCode).toBe(200)
  })

  it('returns 404 when user A tries to access user B account', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/test/accounts/${accountBId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NOT_FOUND')
  })

  it('returns 404 when user B tries to access user A account', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/test/accounts/${accountAId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NOT_FOUND')
  })
})
