import * as jose from 'jose';
import { eq, and } from 'drizzle-orm';
import { users, authIdentities } from '@fintivi/db/schema';
import type { Db } from '@fintivi/db/client';
import type { User, AuthIdentity } from '@fintivi/db/schema';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

let googleJWKS: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getGoogleJWKS(): ReturnType<typeof jose.createRemoteJWKSet> {
  if (!googleJWKS) {
    googleJWKS = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  }
  return googleJWKS;
}

export async function verifyGoogleToken(
  idToken: string,
  clientId: string,
): Promise<{ sub: string; email: string; emailVerified: boolean } | null> {
  try {
    const JWKS = getGoogleJWKS();
    const { payload } = await jose.jwtVerify(idToken, JWKS, {
      audience: clientId,
    });

    if (!payload.sub) return null;

    return {
      sub: payload.sub as string,
      email: (payload.email as string) ?? '',
      emailVerified: (payload.email_verified as boolean) ?? false,
    };
  } catch {
    return null;
  }
}

export async function linkOrCreateGoogleUser(
  db: Db,
  googleSub: string,
  email: string,
  market: 'global' | 'india',
  locale: string,
  currency: string,
): Promise<{ user: User; identity: AuthIdentity }> {
  const [existingIdentity] = await db.select().from(authIdentities)
    .where(and(
      eq(authIdentities.provider, 'google'),
      eq(authIdentities.providerSubject, googleSub),
    ))
    .limit(1);

  if (existingIdentity) {
    const [user] = await db.select().from(users)
      .where(eq(users.id, existingIdentity.userId))
      .limit(1);
    return { user: user!, identity: existingIdentity };
  }

  const [existingUser] = await db.select().from(users)
    .where(eq(users.email, email))
    .limit(1);

  let user: User;
  if (existingUser) {
    user = existingUser;
    if (!user.displayName && email) {
      const [updated] = await db.update(users)
        .set({ displayName: email.split('@')[0]!, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      user = updated!;
    }
  } else {
    const [created] = await db.insert(users).values({
      email,
      displayName: email.split('@')[0],
      market,
      locale,
      currency,
    }).returning();
    user = created!;
  }

  const [identity] = await db.insert(authIdentities).values({
    userId: user.id,
    provider: 'google',
    providerSubject: googleSub,
    verifiedAt: new Date(),
  }).returning();

  if (!identity) throw new Error('Failed to create auth identity');

  return { user, identity };
}
