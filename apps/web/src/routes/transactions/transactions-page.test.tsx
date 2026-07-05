import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TransactionsView } from './transactions-page'

describe('TransactionsView', () => {
  it('renders transaction rows', () => {
    render(<MemoryRouter><TransactionsView transactions={[{ id: 't1', userId: 'u1', accountId: 'a1', postedAt: '2026-01-15', description: 'Amazon', amountMinor: -2999, currency: 'USD', categoryId: null, notes: null, externalFingerprint: 'fp1' }]} onUpdate={vi.fn()} onDelete={vi.fn()} /></MemoryRouter>)

    expect(screen.getByText('Amazon')).toBeInTheDocument()
    expect(screen.getByText('-$29.99')).toBeInTheDocument()
  })
})
