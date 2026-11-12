import "server-only";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { normalizeHostname } from "@/lib/validation/hostname";

const CACHE_WINDOW_MS = 15 * 60_000;

const MAX_PER_TARGET_PER_HOUR = 6;

export type PublicScanRefusal =
  | "invalid_hostname"
  | "account_not_active"
  | "target_throttled";

export type PublicScanAuthorization =
  | { granted: true; hostname: string; cached: { scanId: string } | null }
  | { granted: false; reason: PublicScanRefusal; message: string };

export async function authorizePublicScan(input: {
  userId: string;
  userStatus: string;
  hostname: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}): Promise<PublicScanAuthorization> {
  const normalized = normalizeHostname(input.hostname);
  if (!normalized.ok) {
    return {
      granted: false,
      reason: "invalid_hostname",
      message: normalized.reason,
    };
  }
  const hostname = normalized.hostname;

  if (input.userStatus !== "ACTIVE") {
    await writeAudit({
      actorUserId: input.userId,
      action: "PUBLIC_SCAN_REFUSED",
      targetType: "Hostname",
      targetId: hostname,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      metadata: { reason: "account_not_active" },
    });
    return {
      granted: false,
      reason: "account_not_active",
      message: "This account cannot run scans.",
    };
  }

  const cached = await prisma.scanResult.findFirst({
    where: {
      hostname,
      scanType: "HEADERS_ONLY",
      status: "COMPLETED",
      completedAt: { gt: new Date(Date.now() - CACHE_WINDOW_MS) },
    },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });

  if (cached) {
    return { granted: true, hostname, cached: { scanId: cached.id } };
  }

  const recentAgainstTarget = await prisma.scanResult.count({
    where: {
      hostname,
      scanType: "HEADERS_ONLY",
      createdAt: { gt: new Date(Date.now() - 3_600_000) },
    },
  });

  if (recentAgainstTarget >= MAX_PER_TARGET_PER_HOUR) {
    await writeAudit({
      actorUserId: input.userId,
      action: "PUBLIC_SCAN_REFUSED",
      targetType: "Hostname",
      targetId: hostname,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      metadata: { reason: "target_throttled", recentAgainstTarget },
    });
    return {
      granted: false,
      reason: "target_throttled",
      message: `${hostname} has been checked ${recentAgainstTarget} times in the last hour. Fulcrum limits how often one host can be checked, regardless of who asks — it will not be used to generate traffic against a site on anyone's behalf. Try again later.`,
    };
  }

  return { granted: true, hostname, cached: null };
}
