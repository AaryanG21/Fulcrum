import "server-only";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { writeAudit } from "@/lib/audit";

export interface LockState {
  locked: boolean;
  until: Date | null;
  retryAfterSeconds: number;
}

export function lockState(user: {
  lockedUntil: Date | null;
}, now = new Date()): LockState {
  if (!user.lockedUntil || user.lockedUntil <= now) {
    return { locked: false, until: null, retryAfterSeconds: 0 };
  }
  return {
    locked: true,
    until: user.lockedUntil,
    retryAfterSeconds: (user.lockedUntil.getTime() - now.getTime()) / 1000,
  };
}

export async function recordFailure(
  userId: string,
  reason: string,
  ctx: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<LockState> {
  const env = getEnv();

  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true, lockedUntil: true },
  });

  if (user.failedLoginCount < env.MAX_FAILED_LOGINS) {
    return { locked: false, until: null, retryAfterSeconds: 0 };
  }

  const over = user.failedLoginCount - env.MAX_FAILED_LOGINS;
  const seconds = Math.min(
    env.LOCKOUT_BASE_SECONDS * 2 ** over,
    60 * 60 * 24,
  );
  const until = new Date(Date.now() + seconds * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: { lockedUntil: until, lockedReason: reason },
  });

  await writeAudit({
    actorUserId: userId,
    action: "ACCOUNT_LOCKED",
    targetType: "User",
    targetId: userId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    metadata: {
      reason,
      failedLoginCount: user.failedLoginCount,
      lockedForSeconds: seconds,
    },
  });

  return { locked: true, until, retryAfterSeconds: seconds };
}

export async function clearFailures(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null, lockedReason: null },
  });
}

export async function adminUnlock(userId: string): Promise<void> {
  await clearFailures(userId);
}
