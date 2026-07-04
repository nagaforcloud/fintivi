import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'

export const rateLimitPlugin = fp(async function (app) {
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  })
})
