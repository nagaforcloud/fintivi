import { createDefaultApiClient } from './client'
import type { DashboardSummary } from './types'

const api = createDefaultApiClient()

export function getDashboard(params?: { from?: string; to?: string }) {
  const query = new URLSearchParams()
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  return api.request<DashboardSummary>(`/dashboard${query.size ? `?${query.toString()}` : ''}`)
}
