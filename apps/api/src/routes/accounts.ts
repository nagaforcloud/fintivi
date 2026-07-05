import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { accounts } from '@fintivi/db/schema'
import { requireAuth } from '../middleware/require-auth.js'
import { requireOwner } from '../middleware/require-owner.js'
import { writeAuditLog } from '../lib/audit.js'

export async function accountRoutes(app: FastifyInstance) {
  app.get('/accounts', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id

    const rows = await db.select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(accounts.name)

    return reply.send({ data: rows })
  })

  app.post('/accounts', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const body = request.body as {
      name: string
      type?: string
      bank?: string
      currency?: string
      balanceMinor?: number
    }

    if (!body.name) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'name is required' },
      })
    }

    const [row] = await db.insert(accounts).values({
      userId,
      name: body.name,
      type: body.type ?? 'checking',
      bank: body.bank ?? '',
      currency: body.currency ?? 'USD',
      balanceMinor: body.balanceMinor ?? 0,
    }).returning()

    await writeAuditLog(db, userId, 'account_create', { accountId: row!.id, name: body.name }, request.ip)

    return reply.status(201).send({ data: row })
  })

  app.patch('/accounts/:id', {
    preHandler: [requireAuth, requireOwner(accounts, 'id')],
  }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const { id } = request.params as { id: string }
    const body = request.body as {
      name?: string
      type?: string
      bank?: string
      currency?: string
      balanceMinor?: number
      isActive?: boolean
    }

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.type !== undefined) updates.type = body.type
    if (body.bank !== undefined) updates.bank = body.bank
    if (body.currency !== undefined) updates.currency = body.currency
    if (body.balanceMinor !== undefined) updates.balanceMinor = body.balanceMinor
    if (body.isActive !== undefined) updates.isActive = body.isActive

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'No fields to update' },
      })
    }

    updates.updatedAt = new Date()

    const [row] = await db.update(accounts)
      .set(updates)
      .where(eq(accounts.id, id))
      .returning()

    await writeAuditLog(db, userId, 'account_update', { accountId: id, updates: Object.keys(updates) }, request.ip)

    return reply.send({ data: row })
  })

  app.delete('/accounts/:id', {
    preHandler: [requireAuth, requireOwner(accounts, 'id')],
  }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const { id } = request.params as { id: string }

    await db.delete(accounts)
      .where(eq(accounts.id, id))

    await writeAuditLog(db, userId, 'account_delete', { accountId: id }, request.ip)

    return reply.send({ data: { ok: true } })
  })
}
