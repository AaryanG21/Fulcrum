import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk, getRequestMeta } from "@/lib/http";
import { enforceCsrf, enforceRateLimit } from "@/lib/auth/guards";
import { ipAccountKey } from "@/lib/security/rate-limit";
import { emailOnlySchema, parseJsonBody } from "@/lib/validation/schemas";
import { sendVerificationEmail } from "@/lib/auth/account-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request);

  const blocked = await enforceCsrf(request);
  if (blocked) return blocked;

  const body = await parseJsonBody(request, emailOnlySchema);
  if (!body.ok) {
    return apiError(400, "invalid_input", "Enter a valid email address.", body.fieldErrors);
  }

  const { email } = body.data;

  const limited = await enforceRateLimit(
    request,
    "emailResend",
    ipAccountKey(meta.ipAddress, email),
  );
  if (limited) return limited;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerifiedAt: true, status: true },
  });

  if (user && !user.emailVerifiedAt && user.status !== "SUSPENDED") {
    void sendVerificationEmail({ id: user.id, email: user.email }, meta);
  }

  return apiOk({ status: "sent_if_applicable" });
}
