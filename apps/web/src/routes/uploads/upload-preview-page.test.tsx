import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UploadPreviewView } from './upload-preview-page'

const preview = {
  candidates: [{ id: 'generic-csv', label: 'Generic CSV', confidence: 1 }],
  warnings: ['2 rows skipped'],
  transactions: [{ postedAt: '2026-01-15', description: 'Amazon', amountMinor: -2999, currency: 'USD', externalFingerprint: 'fp1' }],
}

describe('UploadPreviewView', () => {
  it('renders warnings, transactions, account selector, and confirm button', () => {
    render(<UploadPreviewView preview={preview} accounts={[{ id: 'a1', userId: 'u1', name: 'Checking', type: 'checking', bank: 'Bank', currency: 'USD', balanceMinor: 0, isActive: true }]} onConfirm={vi.fn()} />)

    expect(screen.getByText('2 rows skipped')).toBeInTheDocument()
    expect(screen.getByText('Amazon')).toBeInTheDocument()
    expect(screen.getByText('-$29.99')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm import/i })).toBeInTheDocument()
  })
})
