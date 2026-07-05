import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TextField } from '../../components/form-field'
import { StatusMessage } from '../../components/status-message'
import { useAuth } from '../../auth/auth-store'
import { loginWithEmail, requestOtp, verifyOtp, getGoogleStartUrl } from '../../api/auth'
import type { ApiRequestError } from '../../api/client'
import { messageForApiError } from '../../lib/errors'

type LoginMode = 'email' | 'otp'

export function LoginPage() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [mode, setMode] = useState<LoginMode>('email')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleEmailLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const password = form.get('password') as string

    try {
      const session = await loginWithEmail({ email, password })
      setSession(session)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(messageForApiError((err as ApiRequestError)))
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const phone = form.get('phone') as string

    if (!otpSent) {
      try {
        await requestOtp({ phone })
        setOtpSent(true)
      } catch (err) {
        setError(messageForApiError((err as ApiRequestError)))
      } finally {
        setLoading(false)
      }
    } else {
      const code = form.get('code') as string
      try {
        const session = await verifyOtp({ phone, code })
        setSession(session)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        setError(messageForApiError((err as ApiRequestError)))
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Fintivi</p>
        <h1>Sign in</h1>

        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}

        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'email' ? 'active' : ''}`} onClick={() => setMode('email')} type="button">Email</button>
          <button className={`auth-tab ${mode === 'otp' ? 'active' : ''}`} onClick={() => setMode('otp')} type="button">Phone OTP</button>
        </div>

        {mode === 'email' ? (
          <form onSubmit={handleEmailLogin}>
            <TextField id="email" label="Email" name="email" type="email" required autoComplete="email" />
            <TextField id="password" label="Password" name="password" type="password" required autoComplete="current-password" />
            <button className="button button--full" disabled={loading} type="submit">{loading ? 'Signing in...' : 'Sign in'}</button>
          </form>
        ) : (
          <form onSubmit={handleOtpRequest}>
            <TextField id="phone" label="Phone number" name="phone" type="tel" required hint="Enter your phone number with country code" />
            {otpSent ? <TextField id="code" label="Verification code" name="code" type="text" required /> : null}
            <button className="button button--full" disabled={loading} type="submit">{loading ? 'Please wait...' : otpSent ? 'Verify code' : 'Send code'}</button>
          </form>
        )}

        <div className="auth-divider"><span>or</span></div>

        <a className="button button--outline button--full" href={getGoogleStartUrl()}>Continue with Google</a>

        <p className="auth-footer">No account? <Link to="/signup">Create one</Link></p>
      </section>
    </main>
  )
}
