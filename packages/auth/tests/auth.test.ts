import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';

const TBL_KEY = vi.hoisted(() => '__tableName');

vi.mock('drizzle-orm', () => {
  const eq = (c: any, v: any) => ({ type: 'eq', column: c, value: v });
  const and = (...conds: any[]) => ({ type: 'and', conds });
  const gt = (c: any, v: any) => ({ type: 'gt', column: c, value: v });
  const isNull = (c: any) => ({ type: 'isNull', column: c });
  const sql = ((s: TemplateStringsArray, ...vals: any[]) => ({ type: 'sql', text: s.join('?'), values: vals })) as any;
  return { eq, and, gt, isNull, sql };
});

vi.mock('@fintivi/db/schema', () => {
  const tableDefs: Record<string, string[]> = {
    users: ['id', 'email', 'phoneE164', 'displayName', 'market', 'locale', 'currency', 'createdAt', 'updatedAt'],
    auth_identities: ['id', 'userId', 'provider', 'providerSubject', 'verifiedAt', 'createdAt'],
    sessions: ['id', 'userId', 'refreshTokenHash', 'userAgent', 'ipHash', 'expiresAt', 'revokedAt', 'createdAt'],
    otp_attempts: ['id', 'phoneHash', 'attemptId', 'codeHash', 'attempts', 'verifiedAt', 'expiresAt', 'createdAt'],
    audit_logs: ['id', 'userId', 'action', 'details', 'ipAddress', 'createdAt'],
  };

  function t(name: string) {
    const table: any = { [TBL_KEY]: name, _: { name } };
    for (const c of tableDefs[name] ?? []) {
      table[c] = { name: c, table };
    }
    return table;
  }

  return {
    users: t('users'),
    authIdentities: t('auth_identities'),
    sessions: t('sessions'),
    otpAttempts: t('otp_attempts'),
    auditLogs: t('audit_logs'),
  };
});

function matchCondition(cond: any, record: any): boolean {
  if (!cond || typeof cond !== 'object') return true;
  if (cond.type === 'eq') return record[cond.column.name] === cond.value;
  if (cond.type === 'and') return cond.conds.every((c: any) => matchCondition(c, record));
  if (cond.type === 'gt') return (record[cond.column.name] ?? 0) > cond.value;
  if (cond.type === 'isNull') return record[cond.column.name] == null;
  return true;
}

function createMockDb(): { store: Record<string, any[]>; db: any } {
  const store: Record<string, any[]> = {};

  function tableName(t: any): string {
    return t[TBL_KEY] ?? t._?.name ?? 'unknown';
  }

  function queryBuilder(table: any, isAggregate: boolean) {
    const name = tableName(table);
    let conds: any[] = [];
    let limitN: number | undefined;

    const q: any = {
      where: (...args: any[]) => {
        conds = args;
        return q;
      },
      orderBy: () => q,
      limit: (n: number) => {
        limitN = n;
        return q;
      },
      then: (resolve: (v: any) => void, reject: (e: any) => void) => {
        try {
          const rows = (store[name] ?? []).filter((r: any) => conds.every((c: any) => matchCondition(c, r)));
          if (isAggregate) {
            resolve([{ count: rows.length }]);
          } else {
            resolve(limitN !== undefined ? rows.slice(0, limitN) : rows);
          }
        } catch (e) {
          reject(e);
        }
      },
    };
    return q;
  }

  function execInsert(table: any, vals: any): Record<string, any>[] {
    const name = tableName(table);
    if (!store[name]) store[name] = [];
    const record = { ...vals, id: vals.id ?? randomUUID(), createdAt: new Date() };
    if (!record.updatedAt) record.updatedAt = new Date();
    store[name].push(record);
    return [record];
  }

  function execUpdate(table: any, cond: any, vals: any): Record<string, any>[] {
    const name = tableName(table);
    const rows = store[name] ?? [];
    const idx = rows.findIndex((r: any) => matchCondition(cond, r));
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...vals };
      return [rows[idx]];
    }
    return [];
  }

  return {
    store,
    db: {
      insert: (table: any) => ({
        values: (vals: any) => {
          const returning = () => execInsert(table, vals);
          return { returning, then: (resolve: any, reject: any) => { try { resolve(returning()); } catch (e) { reject(e); } } };
        },
      }),
      select: (fields?: any) => ({
        from: (table: any) => queryBuilder(table, fields != null && 'count' in fields),
      }),
      update: (table: any) => ({
        set: (vals: any) => ({
          where: (cond: any) => {
            const returning = () => execUpdate(table, cond, vals);
            return { returning, then: (resolve: any, reject: any) => { try { resolve(returning()); } catch (e) { reject(e); } } };
          },
        }),
      }),
    },
  };
}

let mock: ReturnType<typeof createMockDb>;

beforeEach(() => {
  mock = createMockDb();
});

import {
  hashPassword, verifyPassword, createPasswordUser, signInWithPassword,
  generateOtp, hashOtp, verifyOtp, requestOtp, verifyOtpCode,
  createSession, refreshSession, revokeSession, getSessionByTokenHash,
  verifyGoogleToken, linkOrCreateGoogleUser,
  findIdentity, createIdentity, getUserIdentities,
} from '../src/index';

describe('password hashing and verification', () => {
  it('hashes and verifies password round-trip', async () => {
    const password = 'S3cur3P@ss!';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correct-password');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('produces different hashes for same input (bcrypt salt)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });
});

describe('password signup creates user + auth_identities', () => {
  it('creates user and password identity', async () => {
    const result = await createPasswordUser(mock.db, 'test@example.com', 'P@ss1234', 'global', 'en', 'USD');

    expect(result.user.email).toBe('test@example.com');
    expect(result.identity.provider).toBe('password');
    expect(result.identity.userId).toBe(result.user.id);

    const storedUser = mock.store['users']?.[0];
    expect(storedUser?.email).toBe('test@example.com');

    const storedIdentity = mock.store['auth_identities']?.[0];
    expect(storedIdentity?.provider).toBe('password');
    expect(storedIdentity?.providerSubject).not.toBe('P@ss1234');
    expect(storedIdentity?.userId).toBe(storedUser?.id);
  });
});

describe('sign-in with password', () => {
  it('returns user for valid credentials', async () => {
    await createPasswordUser(mock.db, 'test@example.com', 'P@ss1234', 'global', 'en', 'USD');
    const result = await signInWithPassword(mock.db, 'test@example.com', 'P@ss1234');
    expect('error' in result).toBe(false);
    if ('user' in result) {
      expect(result.user.email).toBe('test@example.com');
    }
  });

  it('returns error for wrong email', async () => {
    const result = await signInWithPassword(mock.db, 'nonexistent@example.com', 'P@ss1234');
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toBe('invalid_email');
  });

  it('returns error for wrong password', async () => {
    await createPasswordUser(mock.db, 'test@example.com', 'correct-password', 'global', 'en', 'USD');
    const result = await signInWithPassword(mock.db, 'test@example.com', 'wrong-password');
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toBe('invalid_password');
  });
});

describe('OTP generation', () => {
  it('returns a 6-digit numeric string', () => {
    const code = generateOtp();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('produces distinct values', () => {
    const codes = new Set(Array.from({ length: 50 }, generateOtp));
    expect(codes.size).toBeGreaterThan(45);
  });
});

describe('OTP hashing and verification', () => {
  it('hashes and verifies OTP round-trip', async () => {
    const code = '123456';
    const hash = await hashOtp(code);
    expect(await verifyOtp(code, hash)).toBe(true);
  });

  it('rejects wrong OTP', async () => {
    const hash = await hashOtp('123456');
    expect(await verifyOtp('654321', hash)).toBe(false);
  });
});

describe('OTP request stores hashed values (never raw)', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('stores phone as SHA-256 hash and code as bcrypt hash', async () => {
    const result = await requestOtp(mock.db, '+911234567890', '127.0.0.1');
    if (!result.ok) throw new Error('Expected OTP request to succeed');

    const storedAttempt = mock.store['otp_attempts']?.[0];
    expect(storedAttempt).toBeDefined();

    const expectedPhoneHash = createHash('sha256').update('+911234567890').digest('hex');
    expect(storedAttempt.phoneHash).toBe(expectedPhoneHash);
    expect(storedAttempt.phoneHash).not.toBe('+911234567890');

    expect(storedAttempt.codeHash).toBeDefined();
    expect(storedAttempt.codeHash).not.toBe(result.code);

    expect(storedAttempt.attemptId).toBeDefined();
    expect(storedAttempt.expiresAt).toBeDefined();
  });

  it('returns OTP code in test mode', async () => {
    const result = await requestOtp(mock.db, '+911234567890', '127.0.0.1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.code).toBeDefined();
      expect(result.code).toMatch(/^\d{6}$/);
    }
  });

  it('rate limits after exceeding threshold', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await requestOtp(mock.db, '+911234567890', '127.0.0.1');
      expect(r.ok).toBe(true);
    }
    const overflow = await requestOtp(mock.db, '+911234567890', '127.0.0.1');
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.reason).toBe('rate_limited');
  });
});

describe('OTP verify creates/links auth_identities', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('verifies code and creates auth_identities', async () => {
    const otpResult = await requestOtp(mock.db, '+911234567890', '127.0.0.1');
    if (!otpResult.ok) throw new Error('Expected OTP request to succeed');

    const verifyResult = await verifyOtpCode(mock.db, '+911234567890', otpResult.code!);
    expect(verifyResult.ok).toBe(true);

    const identities = mock.store['auth_identities'] ?? [];
    const phoneIdentity = identities.find((i: any) => i.provider === 'phone_otp');
    expect(phoneIdentity).toBeDefined();
    expect(phoneIdentity.userId).toBeDefined();

    const users = mock.store['users'] ?? [];
    expect(users.length).toBe(1);
    expect(users[0].phoneE164).toBe('+911234567890');
  });

  it('returns error for invalid code', async () => {
    await requestOtp(mock.db, '+911234567890', '127.0.0.1');
    const result = await verifyOtpCode(mock.db, '+911234567890', '000000');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_code');
  });
});

describe('Google callback links by provider subject', () => {
  it('creates user and identity on first call', async () => {
    const result = await linkOrCreateGoogleUser(
      mock.db, 'google-sub-123', 'user@gmail.com', 'global', 'en', 'USD',
    );

    expect(result.user.email).toBe('user@gmail.com');
    expect(result.user.displayName).toBe('user');
    expect(result.identity.provider).toBe('google');
    expect(result.identity.providerSubject).toBe('google-sub-123');

    const storedIdentity = mock.store['auth_identities']?.find(
      (i: any) => i.provider === 'google' && i.providerSubject === 'google-sub-123',
    );
    expect(storedIdentity).toBeDefined();
  });

  it('returns existing identity on second call (same subject)', async () => {
    await linkOrCreateGoogleUser(mock.db, 'google-sub-123', 'user@gmail.com', 'global', 'en', 'USD');

    const second = await linkOrCreateGoogleUser(mock.db, 'google-sub-123', 'user@gmail.com', 'global', 'en', 'USD');

    expect(second.identity.providerSubject).toBe('google-sub-123');
    expect(second.user.email).toBe('user@gmail.com');

    const identities = mock.store['auth_identities']?.filter(
      (i: any) => i.provider === 'google',
    );
    expect(identities?.length).toBe(1);
  });

  it('links to existing user by email', async () => {
    await linkOrCreateGoogleUser(mock.db, 'google-sub-111', 'same@email.com', 'global', 'en', 'USD');

    const second = await linkOrCreateGoogleUser(mock.db, 'google-sub-222', 'same@email.com', 'global', 'en', 'USD');

    expect(second.user.email).toBe('same@email.com');
    expect(second.identity.providerSubject).toBe('google-sub-222');
    expect(mock.store['users']?.length).toBe(1);
    expect(mock.store['auth_identities']?.length).toBe(2);
  });
});



describe('refresh-token rotation revokes previous', () => {
  it('creates session and refresh token', async () => {
    const { session, refreshToken } = await createSession(mock.db, 'user-1');

    expect(session.userId).toBe('user-1');
    expect(refreshToken).toBeDefined();
    expect(refreshToken.length).toBe(64);

    const stored = mock.store['sessions']?.[0];
    expect(stored?.refreshTokenHash).toBeDefined();
    expect(stored?.refreshTokenHash).not.toBe(refreshToken);
  });

  it('rotates refresh token on refresh', async () => {
    const { refreshToken: token1 } = await createSession(mock.db, 'user-1');

    const rotated = await refreshSession(mock.db, token1);
    expect('error' in rotated).toBe(false);

    const originalSession = mock.store['sessions']?.[0];
    expect(originalSession?.revokedAt).toBeDefined();

    const newSession = mock.store['sessions']?.[1];
    expect(newSession?.revokedAt).toBeUndefined();
  });

  it('returns error for revoked session on refresh', async () => {
    const { refreshToken } = await createSession(mock.db, 'user-1');

    await refreshSession(mock.db, refreshToken);

    const reused = await refreshSession(mock.db, refreshToken);
    expect('error' in reused).toBe(true);
    if ('error' in reused) expect(reused.error).toBe('reused');
  });

  it('detects refresh-token reuse and writes audit log', async () => {
    const { refreshToken } = await createSession(mock.db, 'user-1');

    await refreshSession(mock.db, refreshToken);
    const reused = await refreshSession(mock.db, refreshToken);

    expect('error' in reused).toBe(true);
    if ('error' in reused) expect(reused.error).toBe('reused');

    const auditEntry = mock.store['audit_logs']?.find(
      (l: any) => l.action === 'refresh_token_reuse',
    );
    expect(auditEntry).toBeDefined();
    expect(auditEntry?.userId).toBe('user-1');
  });
});

describe('session revocation', () => {
  it('revokes a session by id', async () => {
    const { session } = await createSession(mock.db, 'user-1');
    await revokeSession(mock.db, session.id);

    const stored = mock.store['sessions']?.[0];
    expect(stored?.revokedAt).toBeDefined();
  });
});

describe('identity functions', () => {
  it('finds identity by provider and subject', async () => {
    await createIdentity(mock.db, 'user-1', 'google', 'sub-123');
    const found = await findIdentity(mock.db, 'google', 'sub-123');
    expect(found).not.toBeNull();
    expect(found?.provider).toBe('google');
    expect(found?.providerSubject).toBe('sub-123');
  });

  it('returns null for non-existent identity', async () => {
    const found = await findIdentity(mock.db, 'google', 'no-such-sub');
    expect(found).toBeNull();
  });

  it('lists identities for a user', async () => {
    await createIdentity(mock.db, 'user-1', 'password', 'hash1');
    await createIdentity(mock.db, 'user-1', 'google', 'sub-1');
    const identities = await getUserIdentities(mock.db, 'user-1');
    expect(identities.length).toBe(2);
  });

  it('creates identity with correct fields', async () => {
    const identity = await createIdentity(mock.db, 'user-1', 'phone_otp', 'phone-hash');
    expect(identity.userId).toBe('user-1');
    expect(identity.provider).toBe('phone_otp');
    expect(identity.providerSubject).toBe('phone-hash');
    expect(identity.verifiedAt).toBeDefined();
  });
});

describe('Google token verification', () => {
  it('returns null for invalid token', async () => {
    const result = await verifyGoogleToken('invalid-token', 'test-client-id');
    expect(result).toBeNull();
  });
});
