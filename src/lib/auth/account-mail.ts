import "server-only";
import { getEnv } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
import { errorMessage, log } from "@/lib/log";
import { issueAuthToken } from "@/lib/auth/email-tokens";
import { sendEmail } from "@/lib/email/send";
import {
  appLink,
  passwordChangedMessage,
  passwordResetMessage,
  verifyEmailMessage,
} from "@/lib/email/templates";

interface Recipient {
  id: string;
  email: string;
}

interface Meta {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export async function sendVerificationEmail(user: Recipient, meta: Meta = {}): Promise<void> {
  try {
    const env = getEnv();
    const issued = await issueAuthToken({
      userId: user.id,
      purpose: "EMAIL_VERIFICATION",
      ttlMs: env.EMAIL_VERIFICATION_TTL_HOURS * 3_600_000,
    });
    if (!issued) return;

    await sendEmail(
      verifyEmailMessage({
        to: user.email,
        link: appLink("/verify-email", { token: issued.token }),
        ttlHours: env.EMAIL_VERIFICATION_TTL_HOURS,
      }),
    );

    await writeAudit({
      actorUserId: user.id,
      action: "EMAIL_VERIFICATION_SENT",
      targetType: "User",
      targetId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
  } catch (error) {
    log.error("could not send verification email", { error: errorMessage(error) });
  }
}

export async function sendPasswordResetEmail(user: Recipient, meta: Meta = {}): Promise<void> {
  try {
    const env = getEnv();
    const issued = await issueAuthToken({
      userId: user.id,
      purpose: "PASSWORD_RESET",
      ttlMs: env.PASSWORD_RESET_TTL_MINUTES * 60_000,
    });
    if (!issued) return;

    await sendEmail(
      passwordResetMessage({
        to: user.email,
        link: appLink("/reset-password", { token: issued.token }),
        ttlMinutes: env.PASSWORD_RESET_TTL_MINUTES,
      }),
    );

    await writeAudit({
      actorUserId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      targetType: "User",
      targetId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
    });
  } catch (error) {
    log.error("could not send password reset email", { error: errorMessage(error) });
  }
}

export async function sendPasswordChangedEmail(user: Recipient): Promise<void> {
  try {
    await sendEmail(passwordChangedMessage({ to: user.email }));
  } catch (error) {
    log.error("could not send password changed notice", { error: errorMessage(error) });
  }
}
