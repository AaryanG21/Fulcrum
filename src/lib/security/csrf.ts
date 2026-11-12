import "server-only";
import { getEnv } from "@/lib/env";
import { randomToken, safeEqual } from "@/lib/crypto";
import { CSRF_COOKIE, setAuthCookie, readCookie } from "@/lib/auth/cookies";

const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export type CsrfFailure = "origin_mismatch" | "missing_token" | "token_mismatch";

export type CsrfResult = { ok: true } | { ok: false; reason: CsrfFailure };

export async function issueCsrfToken(): Promise<string> {
  const token = randomToken(32);
  await setAuthCookie({
    name: CSRF_COOKIE,
    value: token,
    httpOnly: false,
    maxAgeSeconds: getEnv().REFRESH_TOKEN_TTL_SECONDS,
  });
  return token;
}

function originAllowed(request: Request): boolean {
  const expected = new URL(getEnv().APP_ORIGIN).origin;

  const origin = request.headers.get("origin");
  if (origin) return origin === expected;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === expected;
    } catch {
      return false;
    }
  }

  return false;
}

export async function verifyCsrf(request: Request): Promise<CsrfResult> {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return { ok: true };

  if (!originAllowed(request)) return { ok: false, reason: "origin_mismatch" };

  const headerToken = request.headers.get(CSRF_HEADER);
  const cookieToken = await readCookie(CSRF_COOKIE);

  if (!headerToken || !cookieToken) return { ok: false, reason: "missing_token" };
  if (!safeEqual(headerToken, cookieToken)) {
    return { ok: false, reason: "token_mismatch" };
  }

  return { ok: true };
}
