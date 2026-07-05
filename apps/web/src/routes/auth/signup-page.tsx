import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TextField, SelectField } from '../../components/form-field'
import { StatusMessage } from '../../components/status-message'
import { useAuth } from '../../auth/auth-store'
import { signupWithEmail } from '../../api/auth'
import type { ApiRequestError } from '../../api/client'
import { messageForApiError } from '../../lib/errors'

const MARKET_CURRENCIES: Record<string, { locale: string; currency: string }> = {
  global: { locale: 'en', currency: 'USD' },
  india: { locale: 'en-IN', currency: 'INR' },
}

export function SignupPage() {
  const navigate = useNavigate()
  const { setSession } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const password = form.get('password') as string
    const market = form.get('market') as 'global' | 'india'
    const defaults = MARKET_CURRENCIES[market]!

    try {
      const session = await signupWithEmail({ email, password, market, locale: defaults.locale, currency: defaults.currency })
      setSession(session)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(messageForApiError((err as ApiRequestError)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Fintivi</p>
        <h1>Create account</h1>

        {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}

        <form onSubmit={handleSubmit}>
          <TextField id="email" label="Email" name="email" type="email" required autoComplete="email" />
          <TextField id="password" label="Password" name="password" type="password" required autoComplete="new-password" minLength={8} />
          <SelectField id="market" label="Market" name="market" required>
            <option value="global">Global</option>
            <option value="india">India</option>
          </SelectField>
          <button className="button button--full" disabled={loading} type="submit">{loading ? 'Creating account...' : 'Create account'}</button>
        </form>

        <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
      </section>
    </main>
  )
}
