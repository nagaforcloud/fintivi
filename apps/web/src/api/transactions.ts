import { createDefaultApiClient } from './client'
import type { Transaction } from './types'

const api = createDefaultApiClient()

export function listTransactions(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params)
  return api.request<{ data?: Transaction[] } | Transaction[]>(`/transactions${query.size ? `?${query.toString()}` : ''}`)
}

export function updateTransaction(id: string, input: { categoryId?: string | null; notes?: string | null }) {
  return api.request<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteTransaction(id: string) {
  return api.request<{ ok: boolean }>(`/transactions/${id}`, { method: 'DELETE' })
}

export function splitTransaction(id: string, splits: Array<{ amountMinor: number; description: string; categoryId: string | null }>) {
  return api.request<Transaction[]>(`/transactions/${id}/split`, { method: 'POST', body: JSON.stringify({ splits }) })
}
