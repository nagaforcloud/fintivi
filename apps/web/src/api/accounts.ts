import { createDefaultApiClient } from './client'
import type { Account } from './types'

const api = createDefaultApiClient()

export function listAccounts() {
  return api.request<Account[]>('/accounts')
}

export function createAccount(input: { name: string; type: string; bank: string; currency: string; balanceMinor: number }) {
  return api.request<Account>('/accounts', { method: 'POST', body: JSON.stringify(input) })
}

export function updateAccount(id: string, input: Partial<{ name: string; type: string; bank: string; currency: string; balanceMinor: number; isActive: boolean }>) {
  return api.request<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}
