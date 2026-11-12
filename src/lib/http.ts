import "server-only";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export function getClientIp(request: Request): string | null {
  const env = getEnv();

  if (!env.TRUST_PROXY_HEADERS) return null;

  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return null;

  const chain = forwarded
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const index = chain.length - env.TRUSTED_PROXY_HOPS;
  if (index < 0 || index >= chain.length) return null;

  const candidate = normalizeIp(chain[index]);
  return candidate;
}

function normalizeIp(value: string | undefined): string | null {
  if (!value) return null;

  let host = value;
  const bracketed = /^\[(.+)\](?::\d+)?$/.exec(host);
  if (bracketed?.[1]) {
    host = bracketed[1];
  } else if (host.split(":").length === 2) {
    host = host.split(":")[0] ?? host;
  }

  return isIP(host) === 0 ? null : host;
}

export function getRequestMeta(request: Request): RequestMeta {
  return {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
    requestId: request.headers.get("x-request-id"),
  };
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json<ApiErrorBody>(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

export function apiOk<T extends object>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, { status });
}

export function apiRateLimited(retryAfterSeconds: number): NextResponse<ApiErrorBody> {
  const response = apiError(
    429,
    "rate_limited",
    "Too many attempts. Try again later.",
  );
  response.headers.set("Retry-After", String(Math.ceil(retryAfterSeconds)));
  return response;
}
