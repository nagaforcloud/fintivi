import type { UploadPreview, UploadProgressEvent } from './types'
import { createDefaultApiClient } from './client'
import { loadStoredSession } from '../auth/token-storage'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/v1'
const api = createDefaultApiClient()

export async function uploadStatement(file: File) {
  const body = new FormData()
  body.append('file', file)
  return api.request<{ jobId: string }>('/uploads', { method: 'POST', body })
}

export function getUploadPreview(jobId: string) {
  return api.request<UploadPreview>(`/uploads/${jobId}/preview`)
}

export function confirmUpload(jobId: string, accountId: string) {
  return api.request<{ imported: number; skipped: number; duplicates: number }>(`/uploads/${jobId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ accountId }),
  })
}

export function subscribeToUploadProgress(jobId: string, handlers: { onProgress: (event: UploadProgressEvent) => void; onComplete: (event: unknown) => void; onError: () => void }) {
  const token = loadStoredSession()?.accessToken ?? ''
  const source = new EventSource(`${baseUrl}/uploads/${jobId}/stream?access_token=${encodeURIComponent(token)}`)
  source.addEventListener('progress', (event) => handlers.onProgress(JSON.parse((event as MessageEvent).data) as UploadProgressEvent))
  source.addEventListener('complete', (event) => {
    handlers.onComplete(JSON.parse((event as MessageEvent).data) as unknown)
    source.close()
  })
  source.onerror = () => {
    handlers.onError()
    source.close()
  }
  return () => source.close()
}
