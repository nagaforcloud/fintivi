import type { FastifyInstance } from 'fastify'
import { transactions } from '@fintivi/db/schema'
import { requireAuth } from '../middleware/require-auth.js'
import { requireOwner } from '../middleware/require-owner.js'
import { writeAuditLog } from '../lib/audit.js'
import {
  listTransactions,
  getTransaction,
  updateTransaction,
  splitTransaction,
  deleteTransaction,
} from '@fintivi/core'

export async function transactionRoutes(app: FastifyInstance) {
  app.get('/transactions', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const query = request.query as {
      accountId?: string
      categoryId?: string
      dateFrom?: string
      dateTo?: string
      search?: string
      page?: string
      perPage?: string
    }

    const result = await listTransactions(db, userId, {
      accountId: query.accountId,
      categoryId: query.categoryId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : undefined,
      perPage: query.perPage ? parseInt(query.perPage, 10) : undefined,
    })

    return reply.send(result)
  })

  app.get('/transactions/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const { id } = request.params as { id: string }

    const txn = await getTransaction(db, userId, id)
    if (!txn) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      })
    }

    return reply.send({ data: txn })
  })

  app.patch('/transactions/:id', {
    preHandler: [requireAuth, requireOwner(transactions, 'id')],
  }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const { id } = request.params as { id: string }
    const body = request.body as {
      categoryId?: string | null
      notes?: string | null
    }

    const txn = await updateTransaction(db, userId, id, {
      categoryId: body.categoryId ?? null,
      notes: body.notes ?? null,
    })

    if (!txn) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      })
    }

    await writeAuditLog(db, userId, 'transaction_update', { transactionId: id, categoryId: body.categoryId ?? null }, request.ip)

    return reply.send({ data: txn })
  })

  app.post('/transactions/:id/split', {
    preHandler: [requireAuth, requireOwner(transactions, 'id')],
  }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const { id } = request.params as { id: string }
    const body = request.body as {
      splits: Array<{ amountMinor: number; categoryId?: string | null; description?: string | null }>
    }

    if (!body.splits || body.splits.length < 2) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'At least 2 splits are required' },
      })
    }

    try {
      const result = await splitTransaction(db, userId, id, body.splits)
      if (!result) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Transaction not found' },
        })
      }
      await writeAuditLog(db, userId, 'transaction_split', { transactionId: id, splitCount: body.splits.length }, request.ip)
      return reply.status(201).send({ data: result })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Split failed'
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message },
      })
    }
  })

  app.delete('/transactions/:id', {
    preHandler: [requireAuth, requireOwner(transactions, 'id')],
  }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const { id } = request.params as { id: string }

    const txn = await deleteTransaction(db, userId, id)
    if (!txn) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      })
    }

    await writeAuditLog(db, userId, 'transaction_delete', { transactionId: id }, request.ip)

    return reply.send({ data: { ok: true } })
  })
}
