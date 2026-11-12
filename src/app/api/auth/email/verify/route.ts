import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk, getRequestMeta } from "@/lib/http";
import { enforceCsrf, enforceRateLimit } from "@/lib/auth/guards";
import { ipAccountKey } from "@/lib/security/rate-limit";
import { parseJsonBody, verifyEmailSchema } from "@/lib/validation/schemas";
import { consumeAuthToken } from "@/lib/auth/email-tokens";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request);

  const blocked = await enforceCsrf(request);
  if (blocked) return blocked;

  const limited = await enforceRateLimit(
    request,
    "emailVerify",
    ipAccountKey(meta.ipAddress, "verify"),
  );
  if (limited) return limited;

  const body = await parseJsonBody(request, verifyEmailSchema);
  if (!body.ok) {
    return apiError(400, "invalid_input", "That link is not valid.");
  }

  const consumed = await consumeAuthToken(body.data.token, "EMAIL_VERIFICATION");
  if (!consumed) {
    return apiError(
      400,
      "invalid_token",
      "This confirmation link is invalid, has already been used, or has expired.",
    );
  }

  await prisma.user.updateMany({
    where: { id: consumed.userId, emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });

  await writeAudit({
    actorUserId: consumed.userId,
    action: "EMAIL_VERIFIED",
    targetType: "User",
    targetId: consumed.userId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    requestId: meta.requestId,
  });

  return apiOk({ status: "verified" });
}
