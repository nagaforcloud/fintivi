import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth-store'

export function ProtectedRoute() {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <Outlet />
}
