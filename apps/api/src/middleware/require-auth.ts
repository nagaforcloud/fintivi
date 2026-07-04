import type { preHandlerHookHandler } from 'fastify'

export const requireAuth: preHandlerHookHandler = async function (request, reply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    })
  }
}
