export const marketValues = ['global', 'india'] as const;
export const providerValues = ['password', 'phone_otp', 'google'] as const;
export const categoryTypeValues = ['income', 'expense', 'transfer'] as const;
export const matchTypeValues = ['contains', 'regex', 'exact'] as const;
export const uploadStatusValues = [
  'queued', 'validating', 'parsing', 'preview_ready', 'importing',
  'completed', 'failed', 'completed_with_warnings',
] as const;
