import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/auth-store'
import { ProtectedRoute } from './auth/protected-route'
import { LoginPage } from './routes/auth/login-page'
import { SignupPage } from './routes/auth/signup-page'
import { GoogleCallbackPage } from './routes/auth/google-callback-page'
import { DashboardPage } from './routes/dashboard/dashboard-page'
import { AccountsPage } from './routes/accounts/accounts-page'
import { UploadPage } from './routes/uploads/upload-page'
import { UploadPreviewPage } from './routes/uploads/upload-preview-page'
import { TransactionsPage } from './routes/transactions/transactions-page'
import { SplitTransactionPage } from './routes/transactions/split-transaction-page'
import { SettingsPage } from './routes/settings/settings-page'
import { AppLayout } from './components/app-layout'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/uploads/new" element={<UploadPage />} />
              <Route path="/uploads/:jobId/preview" element={<UploadPreviewPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/transactions/:id/split" element={<SplitTransactionPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
