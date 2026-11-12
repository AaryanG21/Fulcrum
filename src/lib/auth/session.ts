import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { randomToken, sha256 } from "@/lib/crypto";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAllAuthCookies,
  readCookie,
  setAuthCookie,
} from "@/lib/auth/cookies";
import { signAccessToken, verifyAccessToken } from "@/lib/auth/tokens";
import { writeAudit } from "@/lib/audit";
import type { Role, UserStatus } from "@/generated/prisma/enums";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  sessionId: string;
}

interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createSession(
  userId: string,
  role: Role,
  ctx: RequestContext = {},
): Promise<void> {
  const env = getEnv();
  const familyId = randomUUID();

  await issueTokenPair({ userId, role, familyId, ctx });

  await writeAudit({
    actorUserId: userId,
    action: "SESSION_CREATED",
    targetType: "User",
    targetId: userId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: { familyId, ttlSeconds: env.REFRESH_TOKEN_TTL_SECONDS },
  });
}

async function issueTokenPair(args: {
  userId: string;
  role: Role;
  familyId: string;
  replacesId?: string;
  ctx: RequestContext;
}): Promise<void> {
  const env = getEnv();

  const refreshToken = randomToken(32);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000);

  await prisma.$transaction(async (tx) => {
    const created = await tx.refreshToken.create({
      data: {
        userId: args.userId,
        tokenHash: sha256(refreshToken),
        familyId: args.familyId,
        expiresAt,
        ipAddress: args.ctx.ipAddress ?? null,
        userAgent: args.ctx.userAgent ?? null,
      },
      select: { id: true },
    });

    if (args.replacesId) {
      await tx.refreshToken.update({
        where: { id: args.replacesId },
        data: { replacedById: created.id },
      });
    }
  });

  const accessToken = await signAccessToken({
    userId: args.userId,
    role: args.role,
    sessionId: args.familyId,
  });

  await setAuthCookie({
    name: ACCESS_COOKIE,
    value: accessToken,
    maxAgeSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
  });

  await setAuthCookie({
    name: REFRESH_COOKIE,
    value: refreshToken,
    maxAgeSeconds: env.REFRESH_TOKEN_TTL_SECONDS,
    path: "/api/auth",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = await readCookie(ACCESS_COOKIE);
  if (!token) return null;

  const claims = await verifyAccessToken(token);
  if (!claims?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!user) return null;
  if (user.status !== "ACTIVE") return null;

  const familyAlive = await prisma.refreshToken.count({
    where: {
      familyId: claims.sid,
      userId: user.id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (familyAlive === 0) return null;

  return { ...user, sessionId: claims.sid };
}

export type RefreshOutcome =
  | { ok: true }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "revoked" | "reuse" | "inactive" };

export async function rotateSession(
  ctx: RequestContext = {},
): Promise<RefreshOutcome> {
  const presented = await readCookie(REFRESH_COOKIE);
  if (!presented) return { ok: false, reason: "missing" };

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(presented) },
    include: {
      user: { select: { id: true, role: true, status: true } },
    },
  });

  if (!record) return { ok: false, reason: "invalid" };

  if (record.replacedById) {
    await handleReuse(record.userId, record.familyId, ctx);
    return { ok: false, reason: "reuse" };
  }

  if (record.revokedAt) {
    if (record.revokedReason === "ROTATED") {
      await handleReuse(record.userId, record.familyId, ctx);
      return { ok: false, reason: "reuse" };
    }
    return { ok: false, reason: "revoked" };
  }

  if (record.expiresAt <= new Date()) return { ok: false, reason: "expired" };
  if (record.user.status !== "ACTIVE") return { ok: false, reason: "inactive" };

  const claimed = await prisma.refreshToken.updateMany({
    where: { id: record.id, revokedAt: null, replacedById: null },
    data: { revokedAt: new Date(), revokedReason: "ROTATED" },
  });

  if (claimed.count === 0) {
    await handleReuse(record.userId, record.familyId, ctx);
    return { ok: false, reason: "reuse" };
  }

  await issueTokenPair({
    userId: record.userId,
    role: record.user.role,
    familyId: record.familyId,
    replacesId: record.id,
    ctx,
  });

  return { ok: true };
}

async function handleReuse(
  userId: string,
  familyId: string,
  ctx: RequestContext,
): Promise<void> {
  await revokeFamily(familyId, "REFRESH_TOKEN_REUSE_DETECTED");
  await clearAllAuthCookies();
  await writeAudit({
    actorUserId: userId,
    action: "REFRESH_TOKEN_REUSE_DETECTED",
    targetType: "RefreshTokenFamily",
    targetId: familyId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
}

export async function revokeFamily(
  familyId: string,
  reason: string,
): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

export async function revokeAllSessions(
  userId: string,
  reason: string,
): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

export async function endSession(ctx: RequestContext = {}): Promise<void> {
  const presented = await readCookie(REFRESH_COOKIE);

  if (presented) {
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(presented) },
      select: { familyId: true, userId: true },
    });

    if (record) {
      await revokeFamily(record.familyId, "LOGOUT");
      await writeAudit({
        actorUserId: record.userId,
        action: "LOGOUT",
        targetType: "User",
        targetId: record.userId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    }
  }

  await clearAllAuthCookies();
}
