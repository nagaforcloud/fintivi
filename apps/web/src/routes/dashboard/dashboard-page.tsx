import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MetricCard } from '../../components/metric-card'
import { DataTable } from '../../components/data-table'
import { StatusMessage } from '../../components/status-message'
import { getDashboard } from '../../api/dashboard'
import type { DashboardSummary } from '../../api/types'
import { formatDate, formatMoney } from '../../lib/format'

export function DashboardView({ summary }: { summary: DashboardSummary }) {
  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Daily finance</h1>
        </div>
        <Link className="button" to="/uploads/new">Import statement</Link>
      </div>
      <div className="metric-grid">
        <MetricCard label="Net cashflow" value={formatMoney(summary.cashflow.netMinor, summary.currency)} detail={`${formatMoney(summary.cashflow.incomeMinor, summary.currency)} in, ${formatMoney(summary.cashflow.expenseMinor, summary.currency)} out`} />
        <MetricCard label="Data health" value={`${summary.dataHealth.pendingReviewCount} pending review`} detail={summary.dataHealth.lastUploadAt ? `Last upload ${formatDate(summary.dataHealth.lastUploadAt)}` : 'No uploads yet'} />
      </div>
      <section className="card-grid">
        {summary.accounts.map((account) => <MetricCard key={account.id} label={account.name} value={formatMoney(account.balanceMinor, account.currency)} />)}
      </section>
      <DataTable label="Recent transactions">
        <thead><tr><th>Date</th><th>Description</th><th>Account</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>{summary.recentTransactions.map((txn) => <tr key={txn.id}><td>{formatDate(txn.postedAt)}</td><td>{txn.description}</td><td>{txn.accountName}</td><td>{txn.categoryName ?? 'Uncategorized'}</td><td>{formatMoney(txn.amountMinor, txn.currency)}</td></tr>)}</tbody>
      </DataTable>
    </section>
  )
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboard().then(setSummary).catch(() => setError('Dashboard could not load. Try again.'))
  }, [])

  if (error) return <StatusMessage tone="error">{error}</StatusMessage>
  if (!summary) return <StatusMessage>Loading dashboard...</StatusMessage>
  return <DashboardView summary={summary} />
}
