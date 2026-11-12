import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk, getRequestMeta } from "@/lib/http";
import { enforceCsrf, enforceRateLimit } from "@/lib/auth/guards";
import { ipAccountKey } from "@/lib/security/rate-limit";
import { parseJsonBody, resetPasswordSchema } from "@/lib/validation/schemas";
import { sha256 } from "@/lib/crypto";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  commitTotpTimeStep,
  redeemBackupCode,
  verifyTotpCode,
} from "@/lib/auth/totp";
import {
  discardAuthTokens,
  findValidAuthToken,
  spendAuthToken,
} from "@/lib/auth/email-tokens";
import { revokeAllSessions } from "@/lib/auth/session";
import { sendPasswordChangedEmail } from "@/lib/auth/account-mail";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVALID_LINK = "This reset link is invalid, has already been used, or has expired.";

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request);

  const blocked = await enforceCsrf(request);
  if (blocked) return blocked;

  const body = await parseJsonBody(request, resetPasswordSchema);
  if (!body.ok) {
    return apiError(400, "invalid_input", "Check the highlighted fields.", body.fieldErrors);
  }

  const { token, password, code, backupCode } = body.data;

  const perToken = await enforceRateLimit(
    request,
    "resetSpend",
    ipAccountKey(meta.ipAddress, sha256(token).slice(0, 16)),
  );
  if (perToken) return perToken;

  const found = await findValidAuthToken(token, "PASSWORD_RESET");
  if (!found) {
    await writeAudit({
      action: "PASSWORD_RESET_FAILED",
      targetType: "Route",
      targetId: "/api/auth/password/reset",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
      metadata: { reason: "invalid_token" },
    });
    return apiError(400, "invalid_token", INVALID_LINK);
  }

  const user = await prisma.user.findUnique({
    where: { id: found.userId },
    select: {
      id: true,
      email: true,
      status: true,
      passwordHash: true,
      emailVerifiedAt: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorLastTimeStep: true,
    },
  });

  if (!user || user.status === "SUSPENDED") {
    return apiError(400, "invalid_token", INVALID_LINK);
  }

  if (await verifyPassword(user.passwordHash, password)) {
    return apiError(
      400,
      "password_reuse",
      "Choose a password you have not used here before.",
      { password: ["Choose a password you have not used here before"] },
    );
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!code && !backupCode) {
      return apiError(
        400,
        "second_factor_required",
        "Enter a code from your authenticator app, or one of your backup codes.",
        { code: ["Enter a 6-digit code or a backup code"] },
      );
    }

    let secondFactorOk = false;

    if (backupCode) {
      secondFactorOk = await redeemBackupCode(user.id, backupCode);
    } else {
      const check = await verifyTotpCode(
        user.twoFactorSecret,
        code!,
        user.twoFactorLastTimeStep,
      );
      secondFactorOk = check.valid;
      if (check.valid) await commitTotpTimeStep(user.id, check.timeStep!);
    }

    if (!secondFactorOk) {
      await writeAudit({
        actorUserId: user.id,
        action: "PASSWORD_RESET_FAILED",
        targetType: "User",
        targetId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        metadata: { reason: "bad_second_factor", method: backupCode ? "backup_code" : "totp" },
      });
      return apiError(
        401,
        "invalid_code",
        "That code did not match. Try the next one from your authenticator app.",
        { code: ["That code did not match"] },
      );
    }
  }

  if (!(await spendAuthToken(found.id))) {
    return apiError(400, "invalid_token", INVALID_LINK);
  }

  const now = new Date();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      passwordChangedAt: now,
      emailVerifiedAt: user.emailVerifiedAt ?? now,
      failedLoginCount: 0,
      lockedUntil: null,
      lockedReason: null,
    },
  });

  await revokeAllSessions(user.id, "PASSWORD_RESET");
  await discardAuthTokens(user.id, "PASSWORD_RESET");

  await writeAudit({
    actorUserId: user.id,
    action: "PASSWORD_RESET_COMPLETED",
    targetType: "User",
    targetId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    requestId: meta.requestId,
    metadata: {
      secondFactor: user.twoFactorEnabled ? (backupCode ? "backup_code" : "totp") : "none",
    },
  });

  void sendPasswordChangedEmail({ id: user.id, email: user.email });

  return apiOk({ status: "password_reset" });
}
