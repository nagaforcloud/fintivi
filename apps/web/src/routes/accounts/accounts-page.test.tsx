import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccountsView } from './accounts-page'

describe('AccountsView', () => {
  it('renders account names, balances, and create button', () => {
    render(<AccountsView accounts={[{ id: 'a1', userId: 'u1', name: 'Checking', type: 'checking', bank: 'Bank', currency: 'USD', balanceMinor: 120000, isActive: true }]} onCreate={vi.fn()} onDeactivate={vi.fn()} />)

    expect(screen.getByText('Checking')).toBeInTheDocument()
    expect(screen.getByText('$1,200.00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })
})
