import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthProvider, useAuth } from './auth-store'
import { saveStoredSession } from './token-storage'

function Probe() {
  const auth = useAuth()
  return <div>{auth.session ? auth.session.user.id : 'signed-out'}</div>
}

describe('AuthProvider', () => {
  it('restores a saved session', () => {
    saveStoredSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      sessionId: 'session',
      user: { id: 'user-id', email: 'user@example.com', market: 'global', locale: 'en', currency: 'USD', displayName: null },
    })

    render(<AuthProvider><Probe /></AuthProvider>)

    expect(screen.getByText('user-id')).toBeInTheDocument()
  })
})
