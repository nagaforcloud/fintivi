import { randomBytes, createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { sessions, auditLogs } from '@fintivi/db/schema';
import type { Db } from '@fintivi/db/client';
import type { Session } from '@fintivi/db/schema';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createSession(
  db: Db,
  userId: string,
  userAgent?: string,
  ipAddress?: string,
): Promise<{ session: Session; refreshToken: string }> {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const ipHash = ipAddress ? hashToken(ipAddress) : null;

  const [session] = await db.insert(sessions).values({
    userId,
    refreshTokenHash,
    userAgent: userAgent ?? null,
    ipHash,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  }).returning();

  if (!session) throw new Error('Failed to create session');

  return { session, refreshToken };
}

export async function refreshSession(
  db: Db,
  refreshToken: string,
): Promise<
  { session: Session; refreshToken: string }
  | { error: 'reused' | 'expired' | 'revoked' }
> {
  const tokenHash = hashToken(refreshToken);
  const [existing] = await db.select().from(sessions)
    .where(eq(sessions.refreshTokenHash, tokenHash))
    .limit(1);

  if (!existing) return { error: 'expired' };

  if (existing.revokedAt) {
    await db.insert(auditLogs).values({
      userId: existing.userId,
      action: 'refresh_token_reuse',
      details: JSON.stringify({ sessionId: existing.id }) as never,
    });
    return { error: 'reused' };
  }

  if (existing.expiresAt < new Date()) {
    return { error: 'expired' };
  }

  await db.update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, existing.id));

  return createSession(db, existing.userId, existing.userAgent ?? undefined, undefined);
}

export async function revokeSession(db: Db, sessionId: string): Promise<void> {
  await db.update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

export async function getSessionByTokenHash(
  db: Db,
  hash: string,
): Promise<Session | null> {
  const [session] = await db.select().from(sessions)
    .where(eq(sessions.refreshTokenHash, hash))
    .limit(1);
  return session ?? null;
}
