import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/require-auth.js'
import { getDashboardSummary } from '@fintivi/core'

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard', { preHandler: [requireAuth] }, async (request, reply) => {
    const db = request.server.db
    const userId = request.user.id
    const query = request.query as { from?: string; to?: string }

    const options: { from?: Date; to?: Date } = {}
    if (query.from) options.from = new Date(query.from)
    if (query.to) options.to = new Date(query.to)

    const summary = await getDashboardSummary(db, userId, options)
    return reply.send({ data: summary })
  })
}
