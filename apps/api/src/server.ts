import Fastify from 'fastify'
import { env } from './env.js'

export function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' })

  app.get('/api/v1/health', async (_request, _reply) => {
    return { data: { ok: true } }
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
