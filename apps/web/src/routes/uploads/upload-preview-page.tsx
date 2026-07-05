import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusMessage } from '../../components/status-message'
import { DataTable } from '../../components/data-table'
import { getUploadPreview, confirmUpload } from '../../api/uploads'
import { listAccounts } from '../../api/accounts'
import type { UploadPreview, Account } from '../../api/types'
import type { ApiRequestError } from '../../api/client'
import { formatDate, formatMoney } from '../../lib/format'
import { messageForApiError } from '../../lib/errors'

interface UploadPreviewViewProps {
  preview: UploadPreview
  accounts: Account[]
  onConfirm: (accountId: string) => void
}

export function UploadPreviewView({ preview, accounts, onConfirm }: UploadPreviewViewProps) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Import</p>
        <h1>Review transactions</h1>
      </div>

      {preview.warnings.map((warning, i) => (
        <StatusMessage key={i} tone="warning">{warning}</StatusMessage>
      ))}

      <DataTable label="Parsed transactions">
        <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
        <tbody>
          {preview.transactions.map((txn, i) => (
            <tr key={i}>
              <td>{formatDate(txn.postedAt)}</td>
              <td>{txn.description}</td>
              <td>{formatMoney(txn.amountMinor, txn.currency)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <div className="field-row">
        <label htmlFor="account">Import into account</label>
        <select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <button className="button" disabled={!accountId} type="button" onClick={() => onConfirm(accountId)}>Confirm import</button>
    </section>
  )
}

export function UploadPreviewPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [preview, setPreview] = useState<UploadPreview | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [result, setResult] = useState<{ imported: number; skipped: number; duplicates: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return
    getUploadPreview(jobId).then(setPreview).catch((err) => setError(messageForApiError(err as ApiRequestError)))
    listAccounts().then(setAccounts).catch(() => {})
  }, [jobId])

  async function handleConfirm(accountId: string) {
    if (!jobId) return
    try {
      const res = await confirmUpload(jobId, accountId)
      setResult(res)
    } catch (err) {
      setError(messageForApiError(err as ApiRequestError))
    }
  }

  if (error) return <StatusMessage tone="error">{error}</StatusMessage>
  if (!preview) return <StatusMessage>Loading preview...</StatusMessage>

  if (result) {
    return (
      <section className="page-stack">
        <StatusMessage tone="success">Imported {result.imported}, skipped {result.skipped}, {result.duplicates} duplicates</StatusMessage>
        <Link className="button" to="/dashboard">Back to dashboard</Link>
      </section>
    )
  }

  return <UploadPreviewView preview={preview} accounts={accounts} onConfirm={handleConfirm} />
}
