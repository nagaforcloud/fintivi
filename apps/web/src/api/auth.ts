import type { AuthSession } from './types'
import { createDefaultApiClient } from './client'

const api = createDefaultApiClient()

export interface SignupInput {
  email: string
  password: string
  market: 'global' | 'india'
  locale: string
  currency: string
}

export async function signupWithEmail(input: SignupInput) {
  return api.request<AuthSession>('/auth/signup', { method: 'POST', body: JSON.stringify(input) })
}

export async function loginWithEmail(input: { email: string; password: string }) {
  return api.request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(input) })
}

export async function requestOtp(input: { phone: string }) {
  return api.request<{ expiresAt: string; code?: string }>('/auth/otp/request', { method: 'POST', body: JSON.stringify(input) })
}

export async function verifyOtp(input: { phone: string; code: string; market?: 'global' | 'india' }) {
  const response = await api.request<{ userId: string; accessToken: string; refreshToken: string; sessionId: string }>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    sessionId: response.sessionId,
    user: {
      id: response.userId,
      email: null,
      market: input.market ?? 'global',
      locale: input.market === 'india' ? 'en-IN' : 'en',
      currency: input.market === 'india' ? 'INR' : 'USD',
      displayName: null,
    },
  } satisfies AuthSession
}

export function getGoogleStartUrl() {
  return `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/v1'}/auth/google/start`
}
