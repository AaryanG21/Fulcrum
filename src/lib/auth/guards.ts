import "server-only";
import type { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { verifyCsrf } from "@/lib/security/csrf";
import { verifyReauthToken } from "@/lib/auth/tokens";
import { REAUTH_COOKIE, clearAuthCookie, readCookie } from "@/lib/auth/cookies";
import { checkRateLimit, type RateLimitName } from "@/lib/security/rate-limit";
import { apiError, apiRateLimited, getRequestMeta } from "@/lib/http";
import { writeAudit } from "@/lib/audit";

export type GuardResult<T> =
  | { ok: true; value: T }
  | { ok: false; response: NextResponse };

export interface GuardOptions {
  rateLimit?: RateLimitName;
  skipCsrf?: boolean;
}

export async function enforceRateLimit(
  request: Request,
  policy: RateLimitName,
  key: string,
  actorUserId?: string | null,
): Promise<NextResponse | null> {
  const result = checkRateLimit(policy, key);
  if (result.allowed) return null;

  const meta = getRequestMeta(request);
  await writeAudit({
    actorUserId: actorUserId ?? null,
    action: "RATE_LIMIT_TRIPPED",
    targetType: "Route",
    targetId: new URL(request.url).pathname,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata: { policy, strikes: result.strikes },
  });

  return apiRateLimited(result.retryAfterSeconds);
}

export async function enforceCsrf(
  request: Request,
  actorUserId?: string | null,
): Promise<NextResponse | null> {
  const csrf = await verifyCsrf(request);
  if (csrf.ok) return null;

  const meta = getRequestMeta(request);
  await writeAudit({
    actorUserId: actorUserId ?? null,
    action: "CSRF_REJECTED",
    targetType: "Route",
    targetId: new URL(request.url).pathname,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata: { reason: csrf.reason },
  });

  return apiError(403, "csrf_failed", "Request could not be verified.");
}

async function runCommonChecks(
  request: Request,
  options: GuardOptions,
  userId?: string,
): Promise<NextResponse | null> {
  if (options.rateLimit) {
    const meta = getRequestMeta(request);
    const key = `${meta.ipAddress ?? "unknown-ip"}|${userId ?? "anon"}`;
    const limited = await enforceRateLimit(request, options.rateLimit, key, userId);
    if (limited) return limited;
  }

  if (!options.skipCsrf) {
    const blocked = await enforceCsrf(request, userId);
    if (blocked) return blocked;
  }

  return null;
}

export async function requireUser(
  request: Request,
  options: GuardOptions = {},
): Promise<GuardResult<SessionUser>> {
  const session = await getSession();

  const blocked = await runCommonChecks(request, options, session?.id);
  if (blocked) return { ok: false, response: blocked };

  if (!session) {
    return {
      ok: false,
      response: apiError(401, "unauthenticated", "Sign in to continue."),
    };
  }

  return { ok: true, value: session };
}

export async function requireAdmin(
  request: Request,
  options: GuardOptions = {},
): Promise<GuardResult<SessionUser>> {
  const result = await requireUser(request, options);
  if (!result.ok) return result;

  if (result.value.role !== "ADMIN") {
    const meta = getRequestMeta(request);
    await writeAudit({
      actorUserId: result.value.id,
      action: "FORBIDDEN_ROLE_ACCESS",
      targetType: "Route",
      targetId: new URL(request.url).pathname,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { requiredRole: "ADMIN", actualRole: result.value.role },
    });

    return {
      ok: false,
      response: apiError(403, "forbidden", "Administrator access required."),
    };
  }

  return result;
}

async function consumeReauth(
  result: GuardResult<SessionUser>,
): Promise<GuardResult<SessionUser>> {
  if (!result.ok) return result;

  const token = await readCookie(REAUTH_COOKIE);
  const claims = token ? await verifyReauthToken(token) : null;

  if (!claims || claims.sub !== result.value.id) {
    return {
      ok: false,
      response: apiError(
        401,
        "reauth_required",
        "Confirm your password and 2FA code to perform this action.",
      ),
    };
  }

  await clearAuthCookie(REAUTH_COOKIE);

  return result;
}

export async function requireAdminWithReauth(
  request: Request,
  options: GuardOptions = {},
): Promise<GuardResult<SessionUser>> {
  return consumeReauth(await requireAdmin(request, options));
}

export async function requireUserWithReauth(
  request: Request,
  options: GuardOptions = {},
): Promise<GuardResult<SessionUser>> {
  return consumeReauth(await requireUser(request, options));
}
