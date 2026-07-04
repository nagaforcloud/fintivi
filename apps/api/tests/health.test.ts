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
