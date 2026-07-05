export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_STATE'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_OTP'
  | 'TOKEN_REUSED'
  | 'TOKEN_EXPIRED'
  | 'GOOGLE_AUTH_FAILED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_ERROR'

export interface ApiError {
  code: ApiErrorCode
  message: string
}

export interface UserProfile {
  id: string
  email: string | null
  phoneE164?: string | null
  displayName?: string | null
  market: 'global' | 'india'
  locale: string
  currency: string
}

export interface AuthSession {
  user: UserProfile
  accessToken: string
  refreshToken: string
  sessionId: string
}

export interface Account {
  id: string
  userId: string
  name: string
  type: string
  bank: string
  currency: string
  balanceMinor: number
  isActive: boolean
}

export interface Transaction {
  id: string
  userId: string
  accountId: string
  postedAt: string
  description: string
  amountMinor: number
  currency: string
  categoryId: string | null
  notes: string | null
  externalFingerprint: string | null
}

export interface DashboardSummary {
  range: { from: string; to: string }
  currency: string
  cashflow: { incomeMinor: number; expenseMinor: number; netMinor: number }
  accounts: Array<{ id: string; name: string; balanceMinor: number; currency: string }>
  recentTransactions: Array<{
    id: string
    postedAt: string
    description: string
    amountMinor: number
    currency: string
    accountName: string
    categoryName: string | null
  }>
  categoryBreakdown: Array<{ categoryName: string; type: string; amountMinor: number }>
  dataHealth: { lastUploadAt: string | null; pendingReviewCount: number; failedUploadCount: number }
}

export interface UploadPreviewTransaction {
  postedAt: string
  description: string
  amountMinor: number
  currency: string
  externalFingerprint: string
}

export interface UploadPreview {
  candidates: Array<{ id?: string; label?: string; confidence?: number }>
  transactions: UploadPreviewTransaction[]
  warnings: string[]
}

export interface UploadProgressEvent {
  stage: string
  percent: number
  message: string
}
