import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import { env } from '../env.js'

export const rateLimitPlugin = fp(async function (app) {
  const isTest = env.NODE_ENV === 'test'
  await app.register(rateLimit, {
    global: !isTest,
    max: isTest ? 10_000 : 100,
    timeWindow: isTest ? '1 second' : '1 minute',
  })
})
