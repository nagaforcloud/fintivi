import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusMessage } from '../../components/status-message'
import { TextField, SelectField } from '../../components/form-field'
import { useAuth } from '../../auth/auth-store'
import { getCurrentUser, updateCurrentUser } from '../../api/users'
import type { UserProfile } from '../../api/types'
import type { ApiRequestError } from '../../api/client'
import { messageForApiError } from '../../lib/errors'

interface SettingsViewProps {
  user: UserProfile
  onSave: (input: { displayName?: string | null; locale: string; currency: string }) => void
  onLogout: () => void
}

export function SettingsView({ user, onSave, onLogout }: SettingsViewProps) {
  const [displayName, setDisplayName] = useState(user.displayName ?? '')
  const [locale, setLocale] = useState(user.locale)
  const [currency, setCurrency] = useState(user.currency)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSave({ displayName: displayName || null, locale, currency })
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Settings</p>
        <h1>Profile</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <TextField id="displayName" label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <SelectField id="locale" label="Locale" value={locale} onChange={(e) => setLocale(e.target.value)} required>
          <option value="en">English</option>
          <option value="en-IN">English (India)</option>
        </SelectField>
        <SelectField id="currency" label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} required>
          <option value="USD">USD</option>
          <option value="INR">INR</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </SelectField>
        <button className="button" type="submit">Save</button>
      </form>

      <hr />

      <button className="button button--outline" type="button" onClick={onLogout}>Log out</button>
    </section>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getCurrentUser().then(setUser).catch((err) => setError(messageForApiError(err as ApiRequestError)))
  }, [])

  async function handleSave(input: { displayName?: string | null; locale: string; currency: string }) {
    try {
      const updated = await updateCurrentUser(input)
      setUser(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(messageForApiError(err as ApiRequestError))
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  if (error) return <StatusMessage tone="error">{error}</StatusMessage>
  if (saved) return <StatusMessage tone="success">Profile saved</StatusMessage>
  if (!user) return <StatusMessage>Loading...</StatusMessage>

  return <SettingsView user={user} onSave={handleSave} onLogout={handleLogout} />
}
