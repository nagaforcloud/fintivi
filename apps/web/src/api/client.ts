import type { ApiError, AuthSession } from './types'
import { clearStoredSession, loadStoredSession, saveStoredSession } from '../auth/token-storage'

interface RefreshResponse {
  accessToken: string
  refreshToken: string
  sessionId: string
}

interface ClientOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
  getAccessToken?: () => string | null
  getRefreshToken?: () => string | null
  onRefresh?: (tokens: RefreshResponse) => void
  onAuthExpired?: () => void
}

export class ApiRequestError extends Error implements ApiError {
  code: ApiError['code']
  status: number

  constructor(error: ApiError, status: number) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.code = error.code
    this.status = status
  }
}

const defaultBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/v1'

export function createApiClient(options: ClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? defaultBaseUrl).replace(/\/$/, '')
  const fetchImpl = options.fetchImpl ?? fetch

  async function refreshTokens(): Promise<boolean> {
    const refreshToken = options.getRefreshToken?.()
    if (!refreshToken) return false

    const response = await fetchImpl(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) return false
    const parsed = await response.json() as { data: RefreshResponse }
    options.onRefresh?.(parsed.data)
    return true
  }

  async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const headers = new Headers(init.headers)
    if (!(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

    const token = options.getAccessToken?.()
    if (token) headers.set('Authorization', `Bearer ${token}`)

    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}${path}`, { ...init, headers })
    } catch {
      throw new ApiRequestError({ code: 'NETWORK_ERROR', message: 'Network request failed' }, 0)
    }

    const parsed = await response.json().catch(() => ({})) as { data?: T; error?: ApiError }

    if (response.status === 401 && retry) {
      const refreshed = await refreshTokens()
      if (refreshed) return request<T>(path, init, false)
      options.onAuthExpired?.()
    }

    if (!response.ok) {
      throw new ApiRequestError(parsed.error ?? { code: 'NETWORK_ERROR', message: 'Request failed' }, response.status)
    }

    return parsed.data as T
  }

  return { request }
}

export function createDefaultApiClient() {
  return createApiClient({
    getAccessToken: () => loadStoredSession()?.accessToken ?? null,
    getRefreshToken: () => loadStoredSession()?.refreshToken ?? null,
    onRefresh: (tokens) => {
      const current = loadStoredSession()
      if (!current) return
      const next: AuthSession = { ...current, ...tokens }
      saveStoredSession(next)
    },
    onAuthExpired: () => clearStoredSession(),
  })
}
