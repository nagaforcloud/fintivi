import { eq, and } from 'drizzle-orm';
import { authIdentities } from '@fintivi/db/schema';
import type { Db } from '@fintivi/db/client';
import type { AuthIdentity } from '@fintivi/db/schema';

export async function findIdentity(
  db: Db,
  provider: string,
  providerSubject: string,
): Promise<AuthIdentity | null> {
  const [identity] = await db.select().from(authIdentities)
    .where(and(
      eq(authIdentities.provider, provider as 'password' | 'phone_otp' | 'google'),
      eq(authIdentities.providerSubject, providerSubject),
    ))
    .limit(1);
  return identity ?? null;
}

export async function createIdentity(
  db: Db,
  userId: string,
  provider: string,
  providerSubject: string,
): Promise<AuthIdentity> {
  const [identity] = await db.insert(authIdentities).values({
    userId,
    provider: provider as 'password' | 'phone_otp' | 'google',
    providerSubject,
    verifiedAt: new Date(),
  }).returning();

  if (!identity) throw new Error('Failed to create identity');
  return identity;
}

export async function getUserIdentities(
  db: Db,
  userId: string,
): Promise<AuthIdentity[]> {
  return db.select().from(authIdentities)
    .where(eq(authIdentities.userId, userId));
}
