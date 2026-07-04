import { pgEnum } from 'drizzle-orm/pg-core';

export const marketEnum = pgEnum('market', ['global', 'india']);
export const providerEnum = pgEnum('provider', ['password', 'phone_otp', 'google']);
export const categoryTypeEnum = pgEnum('category_type', ['income', 'expense', 'transfer']);
export const matchTypeEnum = pgEnum('match_type', ['contains', 'regex', 'exact']);
export const uploadStatusEnum = pgEnum('upload_status', [
  'queued', 'validating', 'parsing', 'preview_ready', 'importing',
  'completed', 'failed', 'completed_with_warnings',
]);
