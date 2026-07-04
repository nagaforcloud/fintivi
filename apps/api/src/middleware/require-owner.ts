import type { preHandlerHookHandler } from 'fastify'
import { eq, and } from 'drizzle-orm'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function requireOwner(table: any, idParamName: string): preHandlerHookHandler {
  return async function (request, reply) {
    const db = request.server.db
    const id = (request.params as Record<string, string>)[idParamName]
    const userId = request.user.id

    const [record] = await db.select().from(table)
      .where(and(eq(table.id, id), eq(table.userId, userId)))
      .limit(1)

    if (!record) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      })
    }
  }
}
