import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk, getRequestMeta } from "@/lib/http";
import { requireUser } from "@/lib/auth/guards";
import { randomToken, sha256 } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARE_TTL_DAYS = 30;

const MAX_ACTIVE_LINKS = 5;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> },
) {
  const meta = getRequestMeta(request);
  const guard = await requireUser(request, { rateLimit: "api" });
  if (!guard.ok) return guard.response;

  const { scanId } = await context.params;

  const scan = await prisma.scanResult.findFirst({
    where: { id: scanId, userId: guard.value.id, status: "COMPLETED" },
    select: { id: true, hostname: true },
  });
  if (!scan) return apiError(404, "not_found", "No such scan.");

  const now = new Date();
  const active = await prisma.shareLink.count({
    where: { scanId, userId: guard.value.id, revokedAt: null, expiresAt: { gt: now } },
  });
  if (active >= MAX_ACTIVE_LINKS) {
    return apiError(
      409,
      "too_many_links",
      `This scan already has ${MAX_ACTIVE_LINKS} active share links. Revoke them before making another.`,
    );
  }

  const token = randomToken(32);
  const expiresAt = new Date(now.getTime() + SHARE_TTL_DAYS * 86_400_000);

  await prisma.shareLink.create({
    data: { scanId, userId: guard.value.id, tokenHash: sha256(token), expiresAt },
  });

  await writeAudit({
    actorUserId: guard.value.id,
    action: "SHARE_LINK_CREATED",
    targetType: "ScanResult",
    targetId: scanId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    requestId: meta.requestId,
    metadata: { hostname: scan.hostname, expiresAt: expiresAt.toISOString() },
  });

  const origin = getEnv().APP_ORIGIN.replace(/\/+$/, "");
  const response = apiOk({ url: `${origin}/r/${token}`, expiresAt: expiresAt.toISOString() }, 201);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> },
) {
  const meta = getRequestMeta(request);
  const guard = await requireUser(request, { rateLimit: "api" });
  if (!guard.ok) return guard.response;

  const { scanId } = await context.params;

  const scan = await prisma.scanResult.findFirst({
    where: { id: scanId, userId: guard.value.id },
    select: { id: true },
  });
  if (!scan) return apiError(404, "not_found", "No such scan.");

  const { count } = await prisma.shareLink.updateMany({
    where: { scanId, userId: guard.value.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await writeAudit({
    actorUserId: guard.value.id,
    action: "SHARE_LINK_REVOKED",
    targetType: "ScanResult",
    targetId: scanId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    requestId: meta.requestId,
    metadata: { revoked: count },
  });

  return apiOk({ revoked: count });
}
