import { describe, expect, it } from 'vitest';
import {
  users, authIdentities, sessions, otpAttempts,
  accounts, transactions, transactionSplits,
  categories, categoryRules,
  uploadJobs, uploadJobEvents,
  ingestionEvents, auditLogs,
  marketEnum, providerEnum, categoryTypeEnum, matchTypeEnum, uploadStatusEnum,
} from '../src/schema/index';

describe('users schema', () => {
  it('has expected columns', () => {
    expect(users.id).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.phoneE164).toBeDefined();
    expect(users.displayName).toBeDefined();
    expect(users.market).toBeDefined();
    expect(users.locale).toBeDefined();
    expect(users.currency).toBeDefined();
    expect(users.createdAt).toBeDefined();
    expect(users.updatedAt).toBeDefined();
  });

  it('id is text type', () => {
    expect(users.id.columnType).toBe('PgText');
  });
});

describe('auth_identities schema', () => {
  it('has expected columns', () => {
    expect(authIdentities.id).toBeDefined();
    expect(authIdentities.userId).toBeDefined();
    expect(authIdentities.provider).toBeDefined();
    expect(authIdentities.providerSubject).toBeDefined();
    expect(authIdentities.verifiedAt).toBeDefined();
    expect(authIdentities.createdAt).toBeDefined();
  });
});

describe('sessions schema', () => {
  it('has expected columns', () => {
    expect(sessions.id).toBeDefined();
    expect(sessions.userId).toBeDefined();
    expect(sessions.refreshTokenHash).toBeDefined();
    expect(sessions.userAgent).toBeDefined();
    expect(sessions.ipHash).toBeDefined();
    expect(sessions.expiresAt).toBeDefined();
    expect(sessions.revokedAt).toBeDefined();
    expect(sessions.createdAt).toBeDefined();
  });

  it('user_id is text type', () => {
    expect(sessions.userId.columnType).toBe('PgText');
  });
});

describe('otp_attempts schema', () => {
  it('has expected columns', () => {
    expect(otpAttempts.id).toBeDefined();
    expect(otpAttempts.phoneHash).toBeDefined();
    expect(otpAttempts.attemptId).toBeDefined();
    expect(otpAttempts.codeHash).toBeDefined();
    expect(otpAttempts.attempts).toBeDefined();
    expect(otpAttempts.verifiedAt).toBeDefined();
    expect(otpAttempts.expiresAt).toBeDefined();
    expect(otpAttempts.createdAt).toBeDefined();
  });
});

describe('accounts schema', () => {
  it('has expected columns', () => {
    expect(accounts.id).toBeDefined();
    expect(accounts.userId).toBeDefined();
    expect(accounts.name).toBeDefined();
    expect(accounts.type).toBeDefined();
    expect(accounts.bank).toBeDefined();
    expect(accounts.currency).toBeDefined();
    expect(accounts.balanceMinor).toBeDefined();
    expect(accounts.isActive).toBeDefined();
    expect(accounts.createdAt).toBeDefined();
    expect(accounts.updatedAt).toBeDefined();
  });

  it('user_id is text type', () => {
    expect(accounts.userId.columnType).toBe('PgText');
  });
});

describe('transactions schema', () => {
  it('has expected columns', () => {
    expect(transactions.id).toBeDefined();
    expect(transactions.userId).toBeDefined();
    expect(transactions.accountId).toBeDefined();
    expect(transactions.postedAt).toBeDefined();
    expect(transactions.description).toBeDefined();
    expect(transactions.amountMinor).toBeDefined();
    expect(transactions.currency).toBeDefined();
    expect(transactions.categoryId).toBeDefined();
    expect(transactions.notes).toBeDefined();
    expect(transactions.externalFingerprint).toBeDefined();
    expect(transactions.raw).toBeDefined();
    expect(transactions.createdAt).toBeDefined();
    expect(transactions.updatedAt).toBeDefined();
  });

  it('user_id is text type', () => {
    expect(transactions.userId.columnType).toBe('PgText');
  });
});

describe('transaction_splits schema', () => {
  it('has expected columns', () => {
    expect(transactionSplits.id).toBeDefined();
    expect(transactionSplits.transactionId).toBeDefined();
    expect(transactionSplits.amountMinor).toBeDefined();
    expect(transactionSplits.categoryId).toBeDefined();
    expect(transactionSplits.description).toBeDefined();
    expect(transactionSplits.createdAt).toBeDefined();
  });
});

describe('categories schema', () => {
  it('has expected columns', () => {
    expect(categories.id).toBeDefined();
    expect(categories.userId).toBeDefined();
    expect(categories.name).toBeDefined();
    expect(categories.type).toBeDefined();
    expect(categories.color).toBeDefined();
    expect(categories.icon).toBeDefined();
    expect(categories.isSystem).toBeDefined();
    expect(categories.createdAt).toBeDefined();
  });
});

describe('category_rules schema', () => {
  it('has expected columns', () => {
    expect(categoryRules.id).toBeDefined();
    expect(categoryRules.userId).toBeDefined();
    expect(categoryRules.categoryId).toBeDefined();
    expect(categoryRules.pattern).toBeDefined();
    expect(categoryRules.matchType).toBeDefined();
    expect(categoryRules.priority).toBeDefined();
    expect(categoryRules.createdAt).toBeDefined();
  });
});

describe('upload_jobs schema', () => {
  it('has expected columns', () => {
    expect(uploadJobs.id).toBeDefined();
    expect(uploadJobs.userId).toBeDefined();
    expect(uploadJobs.fileName).toBeDefined();
    expect(uploadJobs.fileSize).toBeDefined();
    expect(uploadJobs.mime).toBeDefined();
    expect(uploadJobs.status).toBeDefined();
    expect(uploadJobs.error).toBeDefined();
    expect(uploadJobs.createdAt).toBeDefined();
    expect(uploadJobs.updatedAt).toBeDefined();
  });

  it('user_id is text type', () => {
    expect(uploadJobs.userId.columnType).toBe('PgText');
  });
});

describe('upload_job_events schema', () => {
  it('has expected columns', () => {
    expect(uploadJobEvents.id).toBeDefined();
    expect(uploadJobEvents.jobId).toBeDefined();
    expect(uploadJobEvents.stage).toBeDefined();
    expect(uploadJobEvents.percent).toBeDefined();
    expect(uploadJobEvents.message).toBeDefined();
    expect(uploadJobEvents.createdAt).toBeDefined();
  });
});

describe('ingestion_events schema', () => {
  it('has expected columns', () => {
    expect(ingestionEvents.id).toBeDefined();
    expect(ingestionEvents.userId).toBeDefined();
    expect(ingestionEvents.fingerprint).toBeDefined();
    expect(ingestionEvents.source).toBeDefined();
    expect(ingestionEvents.status).toBeDefined();
    expect(ingestionEvents.details).toBeDefined();
    expect(ingestionEvents.createdAt).toBeDefined();
  });
});

describe('audit_logs schema', () => {
  it('has expected columns', () => {
    expect(auditLogs.id).toBeDefined();
    expect(auditLogs.userId).toBeDefined();
    expect(auditLogs.action).toBeDefined();
    expect(auditLogs.details).toBeDefined();
    expect(auditLogs.ipAddress).toBeDefined();
    expect(auditLogs.createdAt).toBeDefined();
  });
});

describe('enums', () => {
  it('has market values', () => {
    expect(marketEnum.enumValues).toEqual(['global', 'india']);
  });
  it('has provider values', () => {
    expect(providerEnum.enumValues).toEqual(['password', 'phone_otp', 'google']);
  });
  it('has category type values', () => {
    expect(categoryTypeEnum.enumValues).toEqual(['income', 'expense', 'transfer']);
  });
  it('has match type values', () => {
    expect(matchTypeEnum.enumValues).toEqual(['contains', 'regex', 'exact']);
  });
  it('has upload status values', () => {
    expect(uploadStatusEnum.enumValues).toEqual([
      'queued', 'validating', 'parsing', 'preview_ready', 'importing',
      'completed', 'failed', 'completed_with_warnings',
    ]);
  });
});

describe('UUID text type assertions', () => {
  it('users.id is text', () => {
    expect(users.id.columnType).toBe('PgText');
  });
  it('accounts.userId is text', () => {
    expect(accounts.userId.columnType).toBe('PgText');
  });
  it('transactions.userId is text', () => {
    expect(transactions.userId.columnType).toBe('PgText');
  });
  it('uploadJobs.userId is text', () => {
    expect(uploadJobs.userId.columnType).toBe('PgText');
  });
  it('sessions.userId is text', () => {
    expect(sessions.userId.columnType).toBe('PgText');
  });
});
