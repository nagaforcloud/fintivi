import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/auth-store'

export function AppLayout() {
  const { session } = useAuth()

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <Link to="/dashboard" className="app-logo">Fintivi</Link>
        <div className="app-nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/accounts">Accounts</Link>
          <Link to="/uploads/new">Import</Link>
          <Link to="/transactions">Transactions</Link>
          <Link to="/settings">Settings</Link>
        </div>
        <span className="app-nav-user">{session?.user.email ?? session?.user.displayName}</span>
      </nav>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
