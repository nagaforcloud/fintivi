import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DashboardView } from './dashboard-page'
import type { DashboardSummary } from '../../api/types'

const summary: DashboardSummary = {
  range: { from: '2026-06-01T00:00:00.000Z', to: '2026-06-30T00:00:00.000Z' },
  currency: 'USD',
  cashflow: { incomeMinor: 500000, expenseMinor: 40000, netMinor: 460000 },
  accounts: [{ id: 'acct-1', name: 'Checking', balanceMinor: 120000, currency: 'USD' }],
  recentTransactions: [{ id: 'txn-1', postedAt: '2026-06-17', description: 'Restaurant', amountMinor: -15000, currency: 'USD', accountName: 'Checking', categoryName: 'Food' }],
  categoryBreakdown: [{ categoryName: 'Food', type: 'expense', amountMinor: 40000 }],
  dataHealth: { lastUploadAt: '2026-07-04T10:00:00.000Z', pendingReviewCount: 1, failedUploadCount: 0 },
}

describe('DashboardView', () => {
  it('renders cashflow, accounts, data health, and recent transactions', () => {
    render(<MemoryRouter><DashboardView summary={summary} /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: /daily finance/i })).toBeInTheDocument()
    expect(screen.getByText('$4,600.00')).toBeInTheDocument()
    expect(screen.getAllByText('Checking').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Restaurant')).toBeInTheDocument()
    expect(screen.getByText(/1 pending review/i)).toBeInTheDocument()
  })
})
