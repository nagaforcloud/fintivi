import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { Db } from '@fintivi/db/client'
import { env } from '../env.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; market: string }
    user: { id: string; market: string }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    signAccessToken(payload: { id: string; market: string }): string
  }
}

export const authPlugin = fp(async function (app) {
  app.register(fastifyJwt, {
    secret: env.JWT_ACCESS_SECRET,
  })

  app.decorate('signAccessToken', function (payload: { id: string; market: string }) {
    return app.jwt.sign(payload, { expiresIn: '15m' })
  })
})
