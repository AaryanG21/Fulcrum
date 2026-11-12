import "server-only";
import { prisma } from "@/lib/db";
import { writeAudit, type AuditAction } from "@/lib/audit";
import { getEnv } from "@/lib/env";

export type ScanAuthorization =
  | { granted: true; domainId: string; hostname: string }
  | {
      granted: false;
      reason: ScanRefusalReason;
      message: string;
      hostname?: string;
    };

export type ScanRefusalReason =
  | "domain_not_found"
  | "not_owner"
  | "not_verified"
  | "verification_stale"
  | "verification_revoked"
  | "account_not_active";

const REFUSAL_AUDIT_ACTION: Record<ScanRefusalReason, AuditAction> = {
  domain_not_found: "SCAN_REFUSED_UNVERIFIED_DOMAIN",
  not_owner: "SCAN_REFUSED_NOT_OWNER",
  not_verified: "SCAN_REFUSED_UNVERIFIED_DOMAIN",
  verification_stale: "SCAN_REFUSED_STALE_VERIFICATION",
  verification_revoked: "SCAN_REFUSED_UNVERIFIED_DOMAIN",
  account_not_active: "SCAN_REFUSED_UNVERIFIED_DOMAIN",
};

export function isVerificationStale(
  verifiedAt: Date | null,
  ttlDays: number,
  now: Date = new Date(),
): boolean {
  if (!verifiedAt) return true;
  const ageMs = now.getTime() - verifiedAt.getTime();
  return ageMs > ttlDays * 24 * 60 * 60 * 1000;
}

export interface AuthorizeArgs {
  userId: string;
  userStatus: string;
  domainId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function authorizeScan(args: AuthorizeArgs): Promise<ScanAuthorization> {
  const refuse = async (
    reason: ScanRefusalReason,
    message: string,
    targetId: string,
    extra: Record<string, unknown> = {},
    hostname?: string,
  ): Promise<ScanAuthorization> => {
    await writeAudit({
      actorUserId: args.userId,
      action: REFUSAL_AUDIT_ACTION[reason],
      targetType: "Domain",
      targetId,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      metadata: { reason, ...extra },
    });
    return { granted: false, reason, message, ...(hostname ? { hostname } : {}) };
  };

  if (args.userStatus !== "ACTIVE") {
    return refuse(
      "account_not_active",
      "Your account is not active.",
      args.domainId,
      { userStatus: args.userStatus },
    );
  }

  const domain = await prisma.domain.findUnique({
    where: { id: args.domainId },
    select: {
      id: true,
      userId: true,
      hostname: true,
      verificationStatus: true,
      verifiedAt: true,
      revokedAt: true,
    },
  });

  if (!domain) {
    return refuse("domain_not_found", "That domain is not registered.", args.domainId);
  }

  if (domain.userId !== args.userId) {
    return refuse(
      "not_owner",
      "That domain is not registered.",
      domain.id,
      { hostname: domain.hostname },
    );
  }

  if (domain.revokedAt || domain.verificationStatus === "REVOKED") {
    return refuse(
      "verification_revoked",
      "Verification for this domain was revoked. Re-verify before scanning.",
      domain.id,
      { hostname: domain.hostname },
      domain.hostname,
    );
  }

  if (domain.verificationStatus !== "VERIFIED" || !domain.verifiedAt) {
    return refuse(
      "not_verified",
      "Verify ownership of this domain before scanning it.",
      domain.id,
      { hostname: domain.hostname, status: domain.verificationStatus },
      domain.hostname,
    );
  }

  const ttlDays = getEnv().DOMAIN_VERIFICATION_TTL_DAYS;
  if (isVerificationStale(domain.verifiedAt, ttlDays)) {
    const verifiedOn = domain.verifiedAt.toISOString().slice(0, 10);
    return refuse(
      "verification_stale",
      `Ownership of this domain was last proven on ${verifiedOn}. Verifications expire after ${ttlDays} days — re-run the challenge to scan it again.`,
      domain.id,
      {
        hostname: domain.hostname,
        verifiedAt: domain.verifiedAt.toISOString(),
        ttlDays,
      },
      domain.hostname,
    );
  }

  return { granted: true, domainId: domain.id, hostname: domain.hostname };
}
