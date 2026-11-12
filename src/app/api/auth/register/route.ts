import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { parseJsonBody, registerSchema } from "@/lib/validation/schemas";
import { apiError, apiOk, getRequestMeta } from "@/lib/http";
import { enforceCsrf, enforceRateLimit } from "@/lib/auth/guards";
import { ipAccountKey } from "@/lib/security/rate-limit";
import { writeAudit } from "@/lib/audit";
import { signMfaPendingToken } from "@/lib/auth/tokens";
import { MFA_COOKIE, setAuthCookie } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/env";
import { sendVerificationEmail } from "@/lib/auth/account-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) { const meta = getRequestMeta(request);

  const blocked = await enforceCsrf(request);
  if (blocked) return blocked;

  const body = await parseJsonBody(request, registerSchema);
  if (!body.ok) {
    return apiError(400, "invalid_input", "Check the highlighted fields.", body.fieldErrors);
  }

  const { email, password } = body.data;

  const limited = await enforceRateLimit(
    request,
    "register",
    ipAccountKey(meta.ipAddress, email),
  );
  if (limited) return limited;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    await writeAudit({
      action: "REGISTER",
      targetType: "User",
      targetId: existing.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
      metadata: { outcome: "duplicate_email_suppressed" },
    });

    return apiOk({ status: "enrollment_required" }, 201);
  }

  const passwordHash = await hashPassword(password);

  const consentedAt = new Date();

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      status: "PENDING_2FA",
      role: "USER",
      ageConfirmedAt: consentedAt,
      termsAcceptedAt: consentedAt,
    },
    select: { id: true },
  });

  await writeAudit({
    actorUserId: user.id,
    action: "REGISTER",
    targetType: "User",
    targetId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    requestId: meta.requestId,
    metadata: {
      outcome: "created",
      ageConfirmed: true,
      termsAcceptedAt: consentedAt.toISOString(),
    },
  });

  await sendVerificationEmail({ id: user.id, email }, meta);

  const pendingToken = await signMfaPendingToken(user.id);
  await setAuthCookie({
    name: MFA_COOKIE,
    value: pendingToken,
    maxAgeSeconds: getEnv().MFA_PENDING_TTL_SECONDS,
  });

  return apiOk({ status: "enrollment_required" }, 201);
}
