import type { AuthSession } from '../api/types'

const STORAGE_KEY = 'fintivi.auth'

export function loadStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.sessionId || !parsed.user?.id) return null
    return parsed
  } catch {
    return null
  }
}

export function saveStoredSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY)
}
