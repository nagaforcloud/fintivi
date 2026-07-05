import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AuthSession } from '../api/types'
import { clearStoredSession, loadStoredSession, saveStoredSession } from './token-storage'

interface AuthContextValue {
  session: AuthSession | null
  setSession: (session: AuthSession) => void
  updateTokens: (tokens: { accessToken: string; refreshToken: string; sessionId: string }) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(() => loadStoredSession())

  const value = useMemo<AuthContextValue>(() => ({
    session,
    setSession(next) {
      setSessionState(next)
      saveStoredSession(next)
    },
    updateTokens(tokens) {
      setSessionState((current) => {
        if (!current) return current
        const next = { ...current, ...tokens }
        saveStoredSession(next)
        return next
      })
    },
    logout() {
      clearStoredSession()
      setSessionState(null)
    },
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
