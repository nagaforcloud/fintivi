import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusMessage } from '../../components/status-message'
import { DataTable } from '../../components/data-table'
import { listTransactions, updateTransaction, deleteTransaction } from '../../api/transactions'
import type { Transaction } from '../../api/types'
import type { ApiRequestError } from '../../api/client'
import { formatDate, formatMoney } from '../../lib/format'
import { messageForApiError } from '../../lib/errors'

interface TransactionsViewProps {
  transactions: Transaction[]
  onUpdate: (id: string, input: { categoryId?: string | null; notes?: string | null }) => void
  onDelete: (id: string) => void
}

export function TransactionsView({ transactions, onUpdate, onDelete }: TransactionsViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Transactions</p>
        <h1>All transactions</h1>
      </div>

      <DataTable label="Transactions">
        <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Notes</th><th>Amount</th><th></th></tr></thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.id}>
              <td>{formatDate(txn.postedAt)}</td>
              <td>{txn.description}</td>
              <td>{txn.categoryId ?? 'Uncategorized'}</td>
              <td>
                {editingId === txn.id ? (
                  <input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} onBlur={() => { onUpdate(txn.id, { notes: editNotes || null }); setEditingId(null) }} autoFocus />
                ) : (
                  <span onClick={() => { setEditingId(txn.id); setEditNotes(txn.notes ?? '') }}>{txn.notes ?? 'Add notes'}</span>
                )}
              </td>
              <td>{formatMoney(txn.amountMinor, txn.currency)}</td>
              <td>
                <Link to={`/transactions/${txn.id}/split`}>Split</Link>
                <button type="button" className="button-link" onClick={() => onDelete(txn.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </section>
  )
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState<string | null>(null)

  function load() {
    listTransactions().then((result) => {
      if (Array.isArray(result)) setTransactions(result)
      else setTransactions(result.data ?? [])
    }).catch((err) => setError(messageForApiError(err as ApiRequestError)))
  }

  useEffect(load, [])

  async function handleUpdate(id: string, input: { categoryId?: string | null; notes?: string | null }) {
    try {
      await updateTransaction(id, input)
      load()
    } catch (err) {
      setError(messageForApiError(err as ApiRequestError))
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTransaction(id)
      load()
    } catch (err) {
      setError(messageForApiError(err as ApiRequestError))
    }
  }

  if (error) return <StatusMessage tone="error">{error}</StatusMessage>

  return <TransactionsView transactions={transactions} onUpdate={handleUpdate} onDelete={handleDelete} />
}
