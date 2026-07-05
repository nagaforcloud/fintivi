import type { preHandlerHookHandler } from 'fastify'

export const requireAuth: preHandlerHookHandler = async function (request, reply) {
  try {
    const accessToken = (request.query as { access_token?: string }).access_token
    if (accessToken) {
      request.headers.authorization = `Bearer ${accessToken}`
    }
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
