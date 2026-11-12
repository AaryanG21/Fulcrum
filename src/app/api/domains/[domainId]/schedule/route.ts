import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk, getRequestMeta } from "@/lib/http";
import { requireUser } from "@/lib/auth/guards";
import { parseJsonBody, scanScheduleSchema } from "@/lib/validation/schemas";
import { isVerificationStale } from "@/lib/domains/allowlist";
import { getEnv } from "@/lib/env";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ domainId: string }> },
) {
  const meta = getRequestMeta(request);
  const guard = await requireUser(request, { rateLimit: "api" });
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, scanScheduleSchema);
  if (!body.ok) {
    return apiError(400, "invalid_input", "Choose weekly or monthly.", body.fieldErrors);
  }

  const { domainId } = await context.params;

  const domain = await prisma.domain.findFirst({
    where: { id: domainId, userId: guard.value.id },
    select: {
      id: true,
      hostname: true,
      verificationStatus: true,
      verifiedAt: true,
      revokedAt: true,
      schedule: { select: { intervalDays: true, enabled: true } },
    },
  });
  if (!domain) return apiError(404, "not_found", "That domain is not registered to you.");

  if (
    domain.verificationStatus !== "VERIFIED" ||
    domain.revokedAt ||
    isVerificationStale(domain.verifiedAt, getEnv().DOMAIN_VERIFICATION_TTL_DAYS)
  ) {
    return apiError(
      403,
      "domain_not_verified",
      "Scheduled scans need a currently verified domain. Verify ownership first.",
    );
  }

  const { intervalDays, budget, notifyOnRegression } = body.data;
  const now = new Date();

  const reschedule =
    !domain.schedule || domain.schedule.intervalDays !== intervalDays || !domain.schedule.enabled;
  const nextRunAt = new Date(now.getTime() + intervalDays * 86_400_000);

  const schedule = await prisma.scanSchedule.upsert({
    where: { domainId },
    create: {
      domainId,
      userId: guard.value.id,
      intervalDays,
      budget,
      notifyOnRegression,
      nextRunAt,
    },
    update: {
      intervalDays,
      budget,
      notifyOnRegression,
      enabled: true,
      pausedReason: null,
      ...(reschedule ? { nextRunAt } : {}),
    },
    select: {
      intervalDays: true,
      budget: true,
      notifyOnRegression: true,
      enabled: true,
      nextRunAt: true,
    },
  });

  await writeAudit({
    actorUserId: guard.value.id,
    action: "SCAN_SCHEDULE_SET",
    targetType: "Domain",
    targetId: domainId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    requestId: meta.requestId,
    metadata: { hostname: domain.hostname, intervalDays, notifyOnRegression },
  });

  return apiOk({
    schedule: { ...schedule, nextRunAt: schedule.nextRunAt.toISOString() },
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ domainId: string }> },
) {
  const meta = getRequestMeta(request);
  const guard = await requireUser(request, { rateLimit: "api" });
  if (!guard.ok) return guard.response;

  const { domainId } = await context.params;

  const domain = await prisma.domain.findFirst({
    where: { id: domainId, userId: guard.value.id },
    select: { id: true, hostname: true },
  });
  if (!domain) return apiError(404, "not_found", "That domain is not registered to you.");

  const { count } = await prisma.scanSchedule.deleteMany({
    where: { domainId, userId: guard.value.id },
  });

  if (count > 0) {
    await writeAudit({
      actorUserId: guard.value.id,
      action: "SCAN_SCHEDULE_REMOVED",
      targetType: "Domain",
      targetId: domainId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
      metadata: { hostname: domain.hostname },
    });
  }

  return apiOk({ removed: count });
}
