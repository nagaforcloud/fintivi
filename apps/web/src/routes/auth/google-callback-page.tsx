import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusMessage } from '../../components/status-message'
import { useAuth } from '../../auth/auth-store'
import type { AuthSession } from '../../api/types'

export function parseGoogleFragment(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const accessToken = params.get('accessToken')
  const refreshToken = params.get('refreshToken')
  const sessionId = params.get('sessionId')
  const id = params.get('userId')
  const email = params.get('email')
  const market = params.get('market') === 'india' ? 'india' : 'global'
  if (!accessToken || !refreshToken || !sessionId || !id) return null
  return {
    accessToken,
    refreshToken,
    sessionId,
    user: { id, email, market, locale: 'en', currency: market === 'india' ? 'INR' : 'USD', displayName: null },
  } satisfies AuthSession
}

export function GoogleCallbackPage() {
  const navigate = useNavigate()
  const { setSession } = useAuth()

  useEffect(() => {
    const session = parseGoogleFragment(window.location.hash)
    if (!session) {
      navigate('/login', { replace: true })
      return
    }

    setSession(session)
    window.history.replaceState(null, '', '/')
    navigate('/dashboard', { replace: true })
  }, [navigate, setSession])

  return <StatusMessage>Signing you in...</StatusMessage>
}
