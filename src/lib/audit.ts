import "server-only";
import { errorMessage, log } from "@/lib/log";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const AUDIT_ACTIONS = [
  "REGISTER",
  "LOGIN_PASSWORD_SUCCESS",
  "LOGIN_PASSWORD_FAILURE",
  "LOGIN_2FA_SUCCESS",
  "LOGIN_2FA_FAILURE",
  "LOGIN_BACKUP_CODE_USED",
  "LOGIN_BLOCKED_LOCKED",
  "LOGIN_BLOCKED_SUSPENDED",
  "LOGIN_BLOCKED_RATE_LIMIT",
  "LOGOUT",
  "SESSION_CREATED",
  "REFRESH_TOKEN_REUSE_DETECTED",
  "ACCOUNT_LOCKED",
  "PASSWORD_CHANGED",
  "PASSWORD_CHANGE_REJECTED",
  "ACCOUNT_DELETED",
  "ACCOUNT_DATA_EXPORTED",
  "TWO_FACTOR_ENROLLED",
  "EMAIL_VERIFICATION_SENT",
  "EMAIL_VERIFIED",
  "LOGIN_BLOCKED_UNVERIFIED_EMAIL",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "PASSWORD_RESET_FAILED",
  "REAUTH_SUCCESS",
  "REAUTH_FAILURE",
  "CSRF_REJECTED",
  "RATE_LIMIT_TRIPPED",
  "FORBIDDEN_ROLE_ACCESS",
  "DOMAIN_ADDED",
  "DOMAIN_VERIFICATION_ATTEMPT",
  "DOMAIN_VERIFIED",
  "DOMAIN_REMOVED",
  "SHARE_LINK_CREATED",
  "SHARE_LINK_REVOKED",
  "SCAN_SCHEDULE_SET",
  "SCAN_SCHEDULE_REMOVED",
  "SCAN_SCHEDULE_PAUSED",
  "SCAN_REQUESTED",
  "PUBLIC_SCAN_REQUESTED",
  "PUBLIC_SCAN_COMPLETED",
  "PUBLIC_SCAN_FAILED",
  "PUBLIC_SCAN_REFUSED",
  "SCAN_REFUSED_UNVERIFIED_DOMAIN",
  "SCAN_REFUSED_NOT_OWNER",
  "SCAN_REFUSED_STALE_VERIFICATION",
  "SCAN_COMPLETED",
  "SCAN_FAILED",
  "SCAN_INJECTION_ATTEMPT_IGNORED",
  "ADMIN_USER_SUSPENDED",
  "ADMIN_USER_REINSTATED",
  "ADMIN_USER_UNLOCKED",
  "ADMIN_DOMAIN_REVOKED",
  "ADMIN_AUDIT_LOG_VIEWED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

export interface AuditEntry {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
}

const FORBIDDEN_KEY = /pass(word|hash)|secret|token|otp|code|authorization|cookie|session/i;

const MAX_VALUE_LENGTH = 120;

const JWT_SHAPE = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;
const LONG_HEX = /^[0-9a-fA-F]{40,}$/;
const LONG_BASE64 = /^[A-Za-z0-9+/_-]{40,}={0,2}$/;
const PHC_HASH = /^\$argon2(id|i|d)\$/;

function looksLikeSecret(value: string): boolean {
  const trimmed = value.trim();
  if (PHC_HASH.test(trimmed)) return true;
  if (JWT_SHAPE.test(trimmed)) return true;
  if (LONG_HEX.test(trimmed)) return true;
  if (LONG_BASE64.test(trimmed)) return true;
  return false;
}

function redactString(value: string): string {
  if (looksLikeSecret(value)) return "[redacted: credential-shaped value]";
  return value.length > MAX_VALUE_LENGTH
    ? `${value.slice(0, MAX_VALUE_LENGTH)}…[truncated]`
    : value;
}

function withRequestId(entry: AuditEntry): Record<string, unknown> | null {
  if (!entry.requestId) return entry.metadata ?? null;
  return { ...(entry.metadata ?? {}), requestId: entry.requestId };
}

export function redactMetadata(
  input: Record<string, unknown> | null | undefined,
  depth = 0,
): Record<string, unknown> | null {
  if (!input) return null;
  if (depth > 4) return { truncated: "max depth" };

  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_KEY.test(key)) {
      out[key] = "[redacted]";
      continue;
    }

    if (typeof value === "string") {
      out[key] = redactString(value);
    } else if (Array.isArray(value)) {
      out[key] = value
        .slice(0, 20)
        .map((v) =>
          typeof v === "object" && v !== null
            ? redactMetadata(v as Record<string, unknown>, depth + 1)
            : typeof v === "string"
              ? redactString(v)
              : v,
        );
    } else if (typeof value === "object" && value !== null) {
      out[key] = redactMetadata(value as Record<string, unknown>, depth + 1);
    } else {
      out[key] = value;
    }
  }

  return out;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    let actorEmail = entry.actorEmail ?? null;
    if (!actorEmail && entry.actorUserId) {
      const actor = await prisma.user.findUnique({
        where: { id: entry.actorUserId },
        select: { email: true },
      });
      actorEmail = actor?.email ?? null;
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? null,
        actorEmail,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent?.slice(0, 300) ?? null,
        metadata: (redactMetadata(withRequestId(entry)) ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  } catch (error) {
    log.error("audit entry could not be persisted", {
      action: entry.action,
      requestId: entry.requestId,
      error: errorMessage(error),
    });
  }
}
