import type { FastifyInstance } from 'fastify'
import { categoryRules } from '@fintivi/db/schema'
import { requireAuth } from '../middleware/require-auth.js'
import { requireOwner } from '../middleware/require-owner.js'
import { writeAuditLog } from '../lib/audit.js'
import {
  listCategories,
  createCategoryRule,
  updateCategoryRule,
  deleteCategoryRule,
} from '@fintivi/core'

export async function categoryRoutes(app: FastifyInstance) {
  app.get('/categories', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id

    const rows = await listCategories(db, userId)
    return reply.send({ data: rows })
  })

  app.post('/categories/rules', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const body = request.body as {
      categoryId: string
      pattern: string
      matchType: 'contains' | 'regex' | 'exact'
      priority?: number
    }

    if (!body.categoryId || !body.pattern || !body.matchType) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'categoryId, pattern, and matchType are required' },
      })
    }

    const rule = await createCategoryRule(db, userId, body)
    await writeAuditLog(db, userId, 'category_rule_create', { ruleId: rule.id, categoryId: body.categoryId, pattern: body.pattern }, request.ip)
    return reply.status(201).send({ data: rule })
  })

  app.patch('/categories/rules/:id', {
    preHandler: [requireAuth, requireOwner(categoryRules, 'id')],
  }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const { id } = request.params as { id: string }
    const body = request.body as {
      categoryId?: string
      pattern?: string
      matchType?: 'contains' | 'regex' | 'exact'
      priority?: number
    }

    const rule = await updateCategoryRule(db, userId, id, body)
    if (!rule) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Category rule not found' },
      })
    }

    await writeAuditLog(db, userId, 'category_rule_update', { ruleId: id, updates: Object.keys(body) }, request.ip)

    return reply.send({ data: rule })
  })

  app.delete('/categories/rules/:id', {
    preHandler: [requireAuth, requireOwner(categoryRules, 'id')],
  }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const { id } = request.params as { id: string }

    const rule = await deleteCategoryRule(db, userId, id)
    if (!rule) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Category rule not found' },
      })
    }

    await writeAuditLog(db, userId, 'category_rule_delete', { ruleId: id }, request.ip)

    return reply.send({ data: { ok: true } })
  })
}
