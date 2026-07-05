import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { StatusMessage } from '../../components/status-message'
import { splitTransaction } from '../../api/transactions'
import { messageForApiError } from '../../lib/errors'
import type { ApiRequestError } from '../../api/client'

interface SplitRow {
  amountMajor: string
  description: string
}

export function SplitTransactionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [splits, setSplits] = useState<SplitRow[]>([{ amountMajor: '', description: '' }, { amountMajor: '', description: '' }])
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!id) return
    setError(null)

    try {
      await splitTransaction(id, splits.map((s) => ({
        amountMinor: Math.round(Number(s.amountMajor) * 100),
        description: s.description,
        categoryId: null,
      })))
      navigate('/transactions', { replace: true })
    } catch (err) {
      setError(messageForApiError(err as ApiRequestError))
    }
  }

  function updateSplit(index: number, field: keyof SplitRow, value: string) {
    setSplits((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function addSplit() {
    setSplits((prev) => [...prev, { amountMajor: '', description: '' }])
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Split</p>
        <h1>Split transaction</h1>
      </div>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}

      {splits.map((split, i) => (
        <div key={i} className="field-row">
          <input placeholder="Amount" type="number" step="0.01" value={split.amountMajor} onChange={(e) => updateSplit(i, 'amountMajor', e.target.value)} />
          <input placeholder="Description" value={split.description} onChange={(e) => updateSplit(i, 'description', e.target.value)} />
        </div>
      ))}

      <button className="button-link" type="button" onClick={addSplit}>+ Add split</button>
      <button className="button" type="button" onClick={handleSubmit}>Save splits</button>
    </section>
  )
}
