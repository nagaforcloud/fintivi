import type { ReactNode } from 'react'

type StatusTone = 'info' | 'success' | 'warning' | 'error'

export function StatusMessage({ tone = 'info', children }: { tone?: StatusTone; children: ReactNode }) {
  return <div className={`status-message status-message--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}
