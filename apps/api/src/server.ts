import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'
import multipart from '@fastify/multipart'
import { sql } from 'drizzle-orm'
import { createDb, type Db } from '@fintivi/db'
import { env } from './env.js'
import { authPlugin } from './plugins/auth.js'
import { rateLimitPlugin } from './plugins/rate-limit.js'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/users.js'
import { uploadRoutes } from './routes/uploads.js'
import { accountRoutes } from './routes/accounts.js'
import { transactionRoutes } from './routes/transactions.js'
import { categoryRoutes } from './routes/categories.js'
import { dashboardRoutes } from './routes/dashboard.js'

export function buildApp(opts?: { db?: Db }) {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' })

  const { db, close } = opts?.db
    ? { db: opts.db, close: async () => {} }
    : createDb(env.DATABASE_URL)

  app.decorate('db', db)

  const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  app.register(cors, { origin: corsOrigins })
  app.register(cookie)
  app.register(sensible)
  app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } })
  app.register(authPlugin)
  app.register(rateLimitPlugin)

  app.get('/api/v1/health', async (_request, _reply) => {
    return { data: { ok: true } }
  })

  app.get('/api/v1/health/ready', async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`)
      return reply.send({ data: { ok: true, db: 'connected' } })
    } catch {
      return reply.status(503).send({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not ready' },
      })
    }
  })

  app.register(authRoutes, { prefix: '/api/v1/auth' })
  app.register(userRoutes, { prefix: '/api/v1/users' })
  app.register(uploadRoutes, { prefix: '/api/v1' })
  app.register(accountRoutes, { prefix: '/api/v1' })
  app.register(transactionRoutes, { prefix: '/api/v1' })
  app.register(categoryRoutes, { prefix: '/api/v1' })
  app.register(dashboardRoutes, { prefix: '/api/v1' })

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
