import "server-only";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { writeAudit } from "@/lib/audit";

const OTHER_STEPS_MARGIN_MS = 300_000;

export function stalledThresholdMs(): number {
  return getEnv().TESTSSL_TIMEOUT_MS + OTHER_STEPS_MARGIN_MS;
}

const REVOKED_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export async function pruneDeadSessions(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - REVOKED_GRACE_MS);

  const { count } = await prisma.refreshToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }],
    },
  });

  return count;
}

export const QUEUED_EXPIRY_MS = 60 * 60 * 1000;

export async function reapExpiredQueuedScans(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - QUEUED_EXPIRY_MS);

  const { count } = await prisma.scanResult.updateMany({
    where: { status: "QUEUED", createdAt: { lt: cutoff } },
    data: {
      status: "FAILED",
      errorMessage:
        "This scan waited in the queue too long and was cancelled before it started. Nothing was scanned. Run it again.",
      completedAt: now,
    },
  });

  return count;
}

export async function pruneExpiredAuthTokens(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { count } = await prisma.authToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }] },
  });
  return count;
}

export async function reapStalledScans(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - stalledThresholdMs());

  const stalled = await prisma.scanResult.findMany({
    where: {
      status: "RUNNING",
      startedAt: { not: null, lt: cutoff },
    },
    select: { id: true, userId: true, domainId: true, startedAt: true },
    take: 100,
  });

  if (stalled.length === 0) return 0;

  const ids = stalled.map((scan) => scan.id);

  const { count } = await prisma.scanResult.updateMany({
    where: { id: { in: ids }, status: "RUNNING" },
    data: {
      status: "FAILED",
      errorMessage:
        "The scan did not finish — the server process ended while it was running. No results were produced; this is not a clean result. Run it again.",
      completedAt: now,
    },
  });

  for (const scan of stalled) {
    await writeAudit({
      actorUserId: scan.userId,
      action: "SCAN_FAILED",
      targetType: "ScanResult",
      targetId: scan.id,
      metadata: {
        reason: "stalled",
        startedAt: scan.startedAt?.toISOString() ?? null,
        thresholdMs: stalledThresholdMs(),
        note: "Marked failed by the reaper; the process did not survive the scan.",
      },
    });
  }

  return count;
}
