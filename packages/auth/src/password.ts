import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { users, authIdentities } from '@fintivi/db/schema';
import type { Db } from '@fintivi/db/client';
import type { User, AuthIdentity } from '@fintivi/db/schema';

const PASSWORD_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, PASSWORD_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createPasswordUser(
  db: Db,
  email: string,
  password: string,
  market: 'global' | 'india',
  locale: string,
  currency: string,
): Promise<{ user: User; identity: AuthIdentity }> {
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({
    email,
    market,
    locale,
    currency,
  }).returning();

  if (!user) throw new Error('Failed to create user');

  const [identity] = await db.insert(authIdentities).values({
    userId: user.id,
    provider: 'password',
    providerSubject: passwordHash,
    verifiedAt: new Date(),
  }).returning();

  if (!identity) throw new Error('Failed to create identity');

  return { user, identity };
}

export async function signInWithPassword(
  db: Db,
  email: string,
  password: string,
): Promise<{ user: User } | { error: string }> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return { error: 'invalid_email' };

  const [identity] = await db.select().from(authIdentities)
    .where(and(
      eq(authIdentities.userId, user.id),
      eq(authIdentities.provider, 'password'),
    ))
    .limit(1);

  if (!identity) return { error: 'no_password_identity' };

  const valid = await verifyPassword(password, identity.providerSubject);
  if (!valid) return { error: 'invalid_password' };

  return { user };
}
