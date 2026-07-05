import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsView } from './settings-page'

describe('SettingsView', () => {
  it('renders user settings and logout button', () => {
    render(<SettingsView user={{ id: 'u1', email: 'user@example.com', displayName: null, market: 'global', locale: 'en', currency: 'USD' }} onSave={vi.fn()} onLogout={vi.fn()} />)

    expect(screen.getByLabelText('Locale')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })
})
