import { describe, it, expect } from 'vitest'
import { buildApp } from '../src/server.js'

describe('GET /api/v1/health', () => {
  it('returns 200 with { data: { ok: true } }', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ data: { ok: true } })
  })
})

describe('GET /api/v1/health/ready', () => {
  it('returns 200 with db connected status when DB is available', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/ready',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.ok).toBe(true)
    expect(response.json().data.db).toBe('connected')
  })

  it('returns 503 when DB readiness check fails', async () => {
    const app = await buildApp({
      db: {
        execute: async () => { throw new Error('db unavailable') },
      } as never,
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health/ready',
    })

    expect(response.statusCode).toBe(503)
    expect(response.json().error.code).toBe('SERVICE_UNAVAILABLE')
  })
})
