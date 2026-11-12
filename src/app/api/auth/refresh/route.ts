import { type NextRequest } from "next/server";
import { apiError, apiOk, getRequestMeta } from "@/lib/http";
import { enforceCsrf, enforceRateLimit } from "@/lib/auth/guards";
import { rotateSession } from "@/lib/auth/session";
import { recordAttempt } from "@/lib/auth/attempts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request);

  const blocked = await enforceCsrf(request);
  if (blocked) return blocked;

  if (meta.ipAddress) {
    const limited = await enforceRateLimit(request, "refresh", meta.ipAddress);
    if (limited) return limited;
  }

  const result = await rotateSession(meta);

  if (!result.ok) {
    await recordAttempt({
      email: "",
      stage: "REFRESH",
      success: false,
      reason: result.reason,
      ...meta,
    });

    const code = result.reason === "reuse" ? "session_revoked" : "refresh_failed";
    return apiError(401, code, "Your session has ended. Sign in again.");
  }

  return apiOk({ status: "refreshed" });
}
