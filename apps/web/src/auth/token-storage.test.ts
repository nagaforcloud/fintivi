import { beforeEach, describe, expect, it } from 'vitest'
import { clearStoredSession, loadStoredSession, saveStoredSession } from './token-storage'
import type { AuthSession } from '../api/types'

const session: AuthSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  sessionId: 'session-id',
  user: {
    id: 'user-id',
    email: 'user@example.com',
    market: 'global',
    locale: 'en',
    currency: 'USD',
    displayName: null,
  },
}

describe('token storage', () => {
  beforeEach(() => localStorage.clear())

  it('saves and loads the auth session', () => {
    saveStoredSession(session)

    expect(loadStoredSession()).toEqual(session)
  })

  it('clears the auth session', () => {
    saveStoredSession(session)
    clearStoredSession()

    expect(loadStoredSession()).toBeNull()
  })

  it('ignores malformed stored data', () => {
    localStorage.setItem('fintivi.auth', '{bad json')

    expect(loadStoredSession()).toBeNull()
  })
})
