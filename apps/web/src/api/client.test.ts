import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'

describe('api client', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('returns response data and attaches bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }))
    const client = createApiClient({ baseUrl: 'https://api.test', fetchImpl: fetchMock, getAccessToken: () => 'token' })

    await expect(client.request<{ ok: boolean }>('/health')).resolves.toEqual({ ok: true })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer token')
  })

  it('throws an ApiRequestError for API error responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Bad input' } }), { status: 400 }))
    const client = createApiClient({ baseUrl: 'https://api.test', fetchImpl: fetchMock })

    await expect(client.request('/broken')).rejects.toMatchObject({ code: 'VALIDATION_ERROR', message: 'Bad input', status: 400 })
  })

  it('refreshes once after a 401 and retries the original request', async () => {
    let accessToken = 'expired'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'TOKEN_EXPIRED', message: 'expired' } }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { accessToken: 'fresh', refreshToken: 'fresh-refresh', sessionId: 'session-id' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }))

    const client = createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: fetchMock,
      getAccessToken: () => accessToken,
      getRefreshToken: () => 'refresh-token',
      onRefresh: (next) => { accessToken = next.accessToken },
      onAuthExpired: vi.fn(),
    })

    await expect(client.request<{ ok: boolean }>('/dashboard')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
