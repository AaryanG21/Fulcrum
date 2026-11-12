import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, getRequestMeta } from "@/lib/http";
import { requireUser } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const meta = getRequestMeta(request);

  const guard = await requireUser(request, { skipCsrf: true, rateLimit: "api" });
  if (!guard.ok) return guard.response;

  const [user, domains, scans, attempts, schedules, shareLinks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: guard.value.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        twoFactorEnabled: true,
        twoFactorEnrolledAt: true,
        ageConfirmedAt: true,
        termsAcceptedAt: true,
        emailVerifiedAt: true,
        passwordChangedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.domain.findMany({
      where: { userId: guard.value.id },
      orderBy: { createdAt: "asc" },
      select: {
        hostname: true,
        verificationStatus: true,
        verificationMethod: true,
        verifiedAt: true,
        createdAt: true,
      },
    }),
    prisma.scanResult.findMany({
      where: { userId: guard.value.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        hostname: true,
        scanType: true,
        status: true,
        score: true,
        grade: true,
        budgetLimit: true,
        budgetUsed: true,
        findings: true,
        remediationPlan: true,
        degradedSteps: true,
        testsslVersion: true,
        createdAt: true,
        completedAt: true,
      },
    }),
    prisma.loginAttempt.findMany({
      where: { OR: [{ userId: guard.value.id }, { email: guard.value.email }] },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        stage: true,
        success: true,
        reason: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    }),
    prisma.scanSchedule.findMany({
      where: { userId: guard.value.id },
      select: {
        intervalDays: true,
        budget: true,
        notifyOnRegression: true,
        enabled: true,
        nextRunAt: true,
        lastRunAt: true,
        pausedReason: true,
        createdAt: true,
        domain: { select: { hostname: true } },
      },
    }),
    prisma.shareLink.findMany({
      where: { userId: guard.value.id },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        scan: { select: { hostname: true, completedAt: true } },
      },
    }),
  ]);

  if (!user) return apiError(401, "unauthenticated", "Sign in to continue.");

  await writeAudit({
    actorUserId: user.id,
    action: "ACCOUNT_DATA_EXPORTED",
    targetType: "User",
    targetId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    requestId: meta.requestId,
    metadata: { domains: domains.length, scans: scans.length, schedules: schedules.length },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    note:
      "Everything Fulcrum holds about this account, except credentials. The " +
      "password hash and the encrypted two-factor secret are deliberately " +
      "excluded: they describe the account rather than you, and exporting " +
      "them would create a durable copy of something nobody can use. " +
      "Security audit records are held separately and are described in the " +
      "privacy policy.",
    account: user,
    domains,
    scans,
    scheduledScans: schedules,
    shareLinks,
    signInHistory: attempts,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="fulcrum-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
