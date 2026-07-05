import { createDefaultApiClient } from './client'
import type { UserProfile } from './types'

const api = createDefaultApiClient()

export function getCurrentUser() {
  return api.request<UserProfile>('/users/me')
}

export function updateCurrentUser(input: Partial<Pick<UserProfile, 'displayName' | 'locale' | 'currency'>>) {
  return api.request<UserProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(input) })
}
