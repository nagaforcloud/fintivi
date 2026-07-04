import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'
import { createDb, type Db } from '@fintivi/db'
import { env } from './env.js'
import { authPlugin } from './plugins/auth.js'
import { rateLimitPlugin } from './plugins/rate-limit.js'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/users.js'

export function buildApp(opts?: { db?: Db }) {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' })

  const { db, close } = opts?.db
    ? { db: opts.db, close: async () => {} }
    : createDb(env.DATABASE_URL)

  app.decorate('db', db)

  app.register(cors)
  app.register(cookie)
  app.register(sensible)
  app.register(authPlugin)
  app.register(rateLimitPlugin)

  app.get('/api/v1/health', async (_request, _reply) => {
    return { data: { ok: true } }
  })

  app.register(authRoutes, { prefix: '/api/v1/auth' })
  app.register(userRoutes, { prefix: '/api/v1/users' })

  app.addHook('onClose', async () => {
    await close()
  })

  return app
}

async function start() {
  const app = buildApp()
  await app.listen({ port: env.PORT, host: env.HOST })
}

const isEntryPoint = process.argv[1] && (process.argv[1]!.endsWith('/server.ts') || process.argv[1]!.endsWith('/server.js'))
if (isEntryPoint) {
  start()
}

process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))
