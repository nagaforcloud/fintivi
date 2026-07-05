import type { ReactNode } from 'react'

export function DataTable({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="table-wrap" role="region" aria-label={label} tabIndex={0}>
      <table>{children}</table>
    </div>
  )
}
