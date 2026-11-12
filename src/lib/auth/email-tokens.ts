import "server-only";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import type { AuthTokenPurpose } from "@/generated/prisma/client";

const RESEND_COOLDOWN_MS = 60_000;

export interface IssuedToken {
  token: string;
}

export async function issueAuthToken(args: {
  userId: string;
  purpose: AuthTokenPurpose;
  ttlMs: number;
  now?: Date;
}): Promise<IssuedToken | null> {
  const now = args.now ?? new Date();

  const latest = await prisma.authToken.findFirst({
    where: { userId: args.userId, purpose: args.purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (latest && now.getTime() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return null;
  }

  await prisma.authToken.deleteMany({
    where: { userId: args.userId, purpose: args.purpose, usedAt: null },
  });

  const token = randomToken(32);

  await prisma.authToken.create({
    data: {
      userId: args.userId,
      purpose: args.purpose,
      tokenHash: sha256(token),
      expiresAt: new Date(now.getTime() + args.ttlMs),
    },
  });

  return { token };
}

export interface ValidToken {
  id: string;
  userId: string;
}

export async function findValidAuthToken(
  token: string,
  purpose: AuthTokenPurpose,
  now: Date = new Date(),
): Promise<ValidToken | null> {
  if (token.length < 20 || token.length > 200) return null;

  const row = await prisma.authToken.findUnique({
    where: { tokenHash: sha256(token) },
    select: { id: true, userId: true, purpose: true, usedAt: true, expiresAt: true },
  });

  if (!row) return null;
  if (row.purpose !== purpose) return null;
  if (row.usedAt) return null;
  if (row.expiresAt.getTime() <= now.getTime()) return null;

  return { id: row.id, userId: row.userId };
}

export async function spendAuthToken(
  id: string,
  now: Date = new Date(),
): Promise<boolean> {
  const spent = await prisma.authToken.updateMany({
    where: { id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  return spent.count === 1;
}

export async function consumeAuthToken(
  token: string,
  purpose: AuthTokenPurpose,
): Promise<ValidToken | null> {
  const found = await findValidAuthToken(token, purpose);
  if (!found) return null;
  return (await spendAuthToken(found.id)) ? found : null;
}

export async function discardAuthTokens(
  userId: string,
  purpose: AuthTokenPurpose,
): Promise<void> {
  await prisma.authToken.deleteMany({ where: { userId, purpose, usedAt: null } });
}
