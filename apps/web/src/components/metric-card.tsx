import type { ReactNode } from 'react'

export function MetricCard({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
      {detail ? <span>{detail}</span> : null}
    </article>
  )
}
