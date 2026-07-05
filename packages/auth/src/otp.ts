import { randomInt, createHmac } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq, and, gt, isNull, sql, desc } from 'drizzle-orm';
import { otpAttempts, authIdentities, users } from '@fintivi/db/schema';
import type { Db } from '@fintivi/db/client';

const OTP_COST = 10;
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const PHONE_RATE_LIMIT = 3;
const PHONE_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const IP_RATE_LIMIT = 10;
const IP_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour


function getPepper(): string {
  return process.env.PHONE_HASH_PEPPER ?? '';
}

function hashPhone(phone: string): string {
  return createHmac('sha256', getPepper()).update(phone).digest('hex');
}

function hashIp(ip: string): string {
  return createHmac('sha256', getPepper()).update(ip).digest('hex');
}

export function generateOtp(): string {
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(6, '0');
}

export async function hashOtp(plain: string): Promise<string> {
  return bcrypt.hash(plain, OTP_COST);
}

export async function verifyOtp(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function requestOtp(
  db: Db,
  phone: string,
  ipAddress: string,
): Promise<{ ok: true; expiresAt: Date; code?: string } | { ok: false; reason: string }> {
  const phoneHash = hashPhone(phone);
  const ipHash = hashIp(ipAddress);

  // Rate limit: 3 per phone per 15 minutes
  const phoneWindow = new Date(Date.now() - PHONE_RATE_WINDOW_MS);
  const [phoneCountResult] = await db.select({ count: sql<number>`count(*)` })
    .from(otpAttempts)
    .where(and(
      eq(otpAttempts.phoneHash, phoneHash),
      gt(otpAttempts.createdAt, phoneWindow),
    ));

  if ((phoneCountResult?.count ?? 0) >= PHONE_RATE_LIMIT) {
    return { ok: false, reason: 'rate_limited' };
  }

  // Rate limit: 10 per IP per hour
  const ipWindow = new Date(Date.now() - IP_RATE_WINDOW_MS);
  const [ipCountResult] = await db.select({ count: sql<number>`count(*)` })
    .from(otpAttempts)
    .where(and(
      eq(otpAttempts.attemptId, ipHash),
      gt(otpAttempts.createdAt, ipWindow),
    ));

  if ((ipCountResult?.count ?? 0) >= IP_RATE_LIMIT) {
    return { ok: false, reason: 'rate_limited' };
  }

  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.update(otpAttempts)
    .set({ verifiedAt: new Date() })
    .where(and(
      eq(otpAttempts.phoneHash, phoneHash),
      isNull(otpAttempts.verifiedAt),
      gt(otpAttempts.expiresAt, new Date()),
    ));

  await db.insert(otpAttempts).values({
    phoneHash,
    attemptId: ipHash,
    codeHash,
    expiresAt,
  });

  const canReturnCode = process.env.OTP_PROVIDER === 'test' && process.env.NODE_ENV === 'test';
  return { ok: true, expiresAt, ...(canReturnCode ? { code } : {}) };
}

export async function verifyOtpCode(
  db: Db,
  phone: string,
  code: string,
  market?: 'global' | 'india',
): Promise<{ ok: true; userId: string; market: 'global' | 'india' } | { ok: false; reason: string }> {
  const phoneHash = hashPhone(phone);

  const [attempt] = await db.select().from(otpAttempts)
    .where(and(
      eq(otpAttempts.phoneHash, phoneHash),
      isNull(otpAttempts.verifiedAt),
      gt(otpAttempts.expiresAt, new Date()),
    ))
    .orderBy(desc(otpAttempts.createdAt))
    .limit(1);

  if (!attempt) return { ok: false, reason: 'no_pending_otp' };

  if (attempt.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' };
  }

  await db.update(otpAttempts)
    .set({ attempts: attempt.attempts + 1 })
    .where(eq(otpAttempts.id, attempt.id));

  const valid = await verifyOtp(code, attempt.codeHash);
  if (!valid) return { ok: false, reason: 'invalid_code' };

  await db.update(otpAttempts)
    .set({ verifiedAt: new Date() })
    .where(eq(otpAttempts.id, attempt.id));

  const [existingUser] = await db.select().from(users)
    .where(eq(users.phoneE164, phone))
    .limit(1);

  let user = existingUser;
  if (!user) {
    const mkt = market ?? 'global';
    const [inserted] = await db.insert(users).values({
      phoneE164: phone,
      market: mkt,
      locale: mkt === 'india' ? 'en-IN' : 'en',
      currency: mkt === 'india' ? 'INR' : 'USD',
    }).returning();
    user = inserted!;
  }

  const uid = user!.id;

  const [existingIdentity] = await db.select().from(authIdentities)
    .where(and(
      eq(authIdentities.userId, uid),
      eq(authIdentities.provider, 'phone_otp'),
    ))
    .limit(1);

  if (!existingIdentity) {
    await db.insert(authIdentities).values({
      userId: uid,
      provider: 'phone_otp',
      providerSubject: phoneHash,
      verifiedAt: new Date(),
    });
  }

  return { ok: true, userId: uid, market: user!.market };
}
