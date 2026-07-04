import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { users } from '@fintivi/db/schema'
import { requireAuth } from '../middleware/require-auth.js'

export async function userRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id

    const [user] = await db.select({
      id: users.id,
      email: users.email,
      phoneE164: users.phoneE164,
      displayName: users.displayName,
      market: users.market,
      locale: users.locale,
      currency: users.currency,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, userId)).limit(1)

    if (!user) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      })
    }

    return reply.send({ data: user })
  })

  app.patch('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id

    const body = request.body as {
      displayName?: string
      locale?: string
      currency?: string
    }

    const updates: Record<string, string> = {}
    if (body.displayName !== undefined) updates.displayName = body.displayName
    if (body.locale !== undefined) updates.locale = body.locale
    if (body.currency !== undefined) updates.currency = body.currency

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'No fields to update' },
      })
    }

    const [user] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        phoneE164: users.phoneE164,
        displayName: users.displayName,
        market: users.market,
        locale: users.locale,
        currency: users.currency,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })

    return reply.send({ data: user })
  })
}
