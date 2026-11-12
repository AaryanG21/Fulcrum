import { type NextRequest } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { apiError, apiOk, getRequestMeta } from "@/lib/http";
import { enforceCsrf, enforceRateLimit } from "@/lib/auth/guards";
import { ipAccountKey } from "@/lib/security/rate-limit";
import { MFA_COOKIE, readCookie } from "@/lib/auth/cookies";
import { verifyMfaPendingToken } from "@/lib/auth/tokens";
import {
  buildOtpAuthUri,
  encryptTotpSecret,
  generateTotpSecret,
} from "@/lib/auth/totp";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const blocked = await enforceCsrf(request);
  if (blocked) return blocked;

  const session = await getSession();

  let userId: string | null = session?.id ?? null;
  if (!userId) {
    const pending = await readCookie(MFA_COOKIE);
    const claims = pending ? await verifyMfaPendingToken(pending) : null;
    userId = claims?.sub ?? null;
  }

  if (!userId) {
    return apiError(401, "unauthenticated", "Start again from the sign-in page.");
  }

  const meta = getRequestMeta(request);
  const limited = await enforceRateLimit(
    request,
    "twoFactor",
    ipAccountKey(meta.ipAddress, userId),
    userId,
  );
  if (limited) return limited;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, status: true, twoFactorEnabled: true },
  });

  if (!user || user.status === "SUSPENDED") {
    return apiError(401, "unauthenticated", "Start again from the sign-in page.");
  }

  if (user.twoFactorEnabled && !session) {
    return apiError(
      403,
      "reauth_required",
      "Sign in fully before changing your authenticator.",
    );
  }

  const secret = generateTotpSecret();
  const otpauthUri = buildOtpAuthUri(user.email, secret);

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: encryptTotpSecret(secret) },
  });

  const qrDataUri = await QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });

  const response = apiOk({
    secret,
    otpauthUri,
    qrDataUri,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
