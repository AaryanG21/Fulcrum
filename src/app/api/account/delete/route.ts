import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiOk, getRequestMeta } from "@/lib/http";
import { requireUserWithReauth } from "@/lib/auth/guards";
import { clearAllAuthCookies } from "@/lib/auth/cookies";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request);

  const guard = await requireUserWithReauth(request, { rateLimit: "passwordReset" });
  if (!guard.ok) return guard.response;

  const user = guard.value;

  await writeAudit({
    actorUserId: user.id,
    actorEmail: user.email,
    action: "ACCOUNT_DELETED",
    targetType: "User",
    targetId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    requestId: meta.requestId,
    metadata: { initiatedBy: "self" },
  });

  const removed = await prisma.$transaction(async (tx) => {
    const attempts = await tx.loginAttempt.deleteMany({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
    });

    await tx.user.delete({ where: { id: user.id } });

    return { loginAttempts: attempts.count };
  });

  await clearAllAuthCookies();

  return apiOk({
    status: "account_deleted",
    loginAttemptsRemoved: removed.loginAttempts,
  });
}
