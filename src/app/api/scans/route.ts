import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk, getRequestMeta } from "@/lib/http";
import { requireUser } from "@/lib/auth/guards";
import { parseJsonBody, scanRequestSchema } from "@/lib/validation/schemas";
import { authorizeScan } from "@/lib/domains/allowlist";
import { writeAudit } from "@/lib/audit";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request);

  const guard = await requireUser(request, { rateLimit: "scan" });
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, scanRequestSchema);
  if (!body.ok) {
    return apiError(400, "invalid_input", "Check the scan parameters.", body.fieldErrors);
  }

  const { domainId, budget } = body.data;

  const authorization = await authorizeScan({
    userId: guard.value.id,
    userStatus: guard.value.status,
    domainId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  if (!authorization.granted) {
    await prisma.scanResult.create({
      data: {
        domainId,
        userId: guard.value.id,
        hostname: authorization.hostname ?? "(unknown domain)",
        scanType: "FULL",
        status: "REFUSED",
        budgetLimit: budget,
        refusalReason: authorization.reason,
        completedAt: new Date(),
      },
    }).catch(() => {
    });

    return apiError(403, `scan_refused_${authorization.reason}`, authorization.message);
  }

  const waiting = await prisma.scanResult.count({ where: { status: "QUEUED" } });
  if (waiting >= getEnv().SCAN_QUEUE_MAX_DEPTH) {
    return apiError(
      429,
      "queue_full",
      "Too many scans are waiting right now. Try again in a few minutes.",
    );
  }

  const scan = await prisma.scanResult.create({
    data: {
      domainId: authorization.domainId,
      userId: guard.value.id,
      hostname: authorization.hostname,
      scanType: "FULL",
      status: "QUEUED",
      budgetLimit: budget,
    },
    select: { id: true },
  });

  await writeAudit({
    actorUserId: guard.value.id,
    action: "SCAN_REQUESTED",
    targetType: "Domain",
    targetId: authorization.domainId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata: { scanId: scan.id, hostname: authorization.hostname, budget },
  });

  return apiOk({ scanId: scan.id, status: "QUEUED" }, 202);
}

export async function GET(request: NextRequest) {
  const guard = await requireUser(request, { skipCsrf: true, rateLimit: "api" });
  if (!guard.ok) return guard.response;

  const scans = await prisma.scanResult.findMany({
    where: { userId: guard.value.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      score: true,
      grade: true,
      budgetLimit: true,
      budgetUsed: true,
      refusalReason: true,
      createdAt: true,
      completedAt: true,
      domain: { select: { hostname: true } },
    },
  });

  return apiOk({ scans });
}
