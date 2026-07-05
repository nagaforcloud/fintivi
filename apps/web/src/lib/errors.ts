import type { ApiError } from '../api/types'

const messages: Record<string, string> = {
  VALIDATION_ERROR: 'Check the highlighted fields and try again.',
  INVALID_STATE: 'This item is not ready for that action yet.',
  UNAUTHORIZED: 'Please sign in again.',
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  INVALID_OTP: 'The code is wrong or expired.',
  TOKEN_REUSED: 'Your session was revoked. Please sign in again.',
  TOKEN_EXPIRED: 'Your session expired. Please sign in again.',
  GOOGLE_AUTH_FAILED: 'Google sign-in failed. Try again with a verified Google account.',
  NOT_FOUND: 'This item is unavailable.',
  RATE_LIMITED: 'Too many attempts. Wait a bit, then try again.',
  SERVICE_UNAVAILABLE: 'Fintivi is temporarily unavailable. Try again soon.',
  NETWORK_ERROR: 'Network request failed. Check your connection and retry.',
}

export function messageForApiError(error: ApiError) {
  return messages[error.code] ?? error.message
}
