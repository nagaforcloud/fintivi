import { useEffect, useState, type FormEvent } from 'react'
import { StatusMessage } from '../../components/status-message'
import { TextField, SelectField } from '../../components/form-field'
import { formatMoney } from '../../lib/format'
import { listAccounts, createAccount, updateAccount } from '../../api/accounts'
import type { Account } from '../../api/types'
import type { ApiRequestError } from '../../api/client'
import { messageForApiError } from '../../lib/errors'

interface AccountsViewProps {
  accounts: Account[]
  onCreate: (input: { name: string; type: string; bank: string; currency: string; balanceMinor: number }) => void
  onDeactivate: (id: string) => void
}

export function AccountsView({ accounts, onCreate, onDeactivate }: AccountsViewProps) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('checking')
  const [bank, setBank] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [balanceMajor, setBalanceMajor] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onCreate({
      name,
      type,
      bank,
      currency,
      balanceMinor: Math.round(Number(balanceMajor) * 100),
    })
    setShowForm(false)
    setName('')
    setType('checking')
    setBank('')
    setCurrency('USD')
    setBalanceMajor('')
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Accounts</p>
          <h1>Your accounts</h1>
        </div>
        <button className="button" type="button" onClick={() => setShowForm(!showForm)}>Create account</button>
      </div>

      {showForm ? (
        <form className="card-stack" onSubmit={handleSubmit}>
          <TextField id="name" label="Account name" value={name} onChange={(e) => setName(e.target.value)} required />
          <SelectField id="type" label="Type" value={type} onChange={(e) => setType(e.target.value)} required>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit">Credit Card</option>
            <option value="investment">Investment</option>
          </SelectField>
          <TextField id="bank" label="Bank name" value={bank} onChange={(e) => setBank(e.target.value)} />
          <SelectField id="currency" label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} required>
            <option value="USD">USD</option>
            <option value="INR">INR</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </SelectField>
          <TextField id="balance" label="Opening balance" type="number" step="0.01" value={balanceMajor} onChange={(e) => setBalanceMajor(e.target.value)} />
          <button className="button" type="submit">Save</button>
        </form>
      ) : null}

      <div className="card-grid">
        {accounts.map((account) => (
          <article key={account.id} className="metric-card">
            <p>{account.name}</p>
            <strong>{formatMoney(account.balanceMinor, account.currency)}</strong>
            <span>{account.bank} &middot; {account.type}</span>
            {account.isActive ? <button className="button button--small" type="button" onClick={() => onDeactivate(account.id)}>Deactivate</button> : <span className="badge">Inactive</span>}
          </article>
        ))}
      </div>
    </section>
  )
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [error, setError] = useState<string | null>(null)

  function load() {
    listAccounts().then(setAccounts).catch((err) => setError(messageForApiError(err as ApiRequestError)))
  }

  useEffect(load, [])

  async function handleCreate(input: { name: string; type: string; bank: string; currency: string; balanceMinor: number }) {
    try {
      await createAccount(input)
      load()
    } catch (err) {
      setError(messageForApiError(err as ApiRequestError))
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await updateAccount(id, { isActive: false })
      load()
    } catch (err) {
      setError(messageForApiError(err as ApiRequestError))
    }
  }

  if (error) return <StatusMessage tone="error">{error}</StatusMessage>

  return <AccountsView accounts={accounts} onCreate={handleCreate} onDeactivate={handleDeactivate} />
}
