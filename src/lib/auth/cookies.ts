import "server-only";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  MFA_COOKIE,
  REAUTH_COOKIE,
  REFRESH_COOKIE,
} from "@/lib/auth/cookie-names";

export { ACCESS_COOKIE, CSRF_COOKIE, MFA_COOKIE, REAUTH_COOKIE, REFRESH_COOKIE };

function isSecureContext(): boolean {
  return getEnv().APP_ORIGIN.startsWith("https://");
}

interface SetOptions {
  name: string;
  value: string;
  maxAgeSeconds: number;
  httpOnly?: boolean;
  path?: string;
}

export async function setAuthCookie(opts: SetOptions): Promise<void> {
  const store = await cookies();
  store.set({
    name: opts.name,
    value: opts.value,
    httpOnly: opts.httpOnly ?? true,
    secure: isSecureContext(),
    sameSite: "strict",
    path: opts.path ?? "/",
    maxAge: opts.maxAgeSeconds,
  });
}

export async function clearAuthCookie(name: string, path = "/"): Promise<void> {
  const store = await cookies();
  store.set({
    name,
    value: "",
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "strict",
    path,
    maxAge: 0,
  });
}

export async function readCookie(name: string): Promise<string | null> {
  const store = await cookies();
  return store.get(name)?.value ?? null;
}

export async function clearAllAuthCookies(): Promise<void> {
  await Promise.all([
    clearAuthCookie(ACCESS_COOKIE),
    clearAuthCookie(REFRESH_COOKIE, "/api/auth"),
    clearAuthCookie(MFA_COOKIE),
    clearAuthCookie(REAUTH_COOKIE),
  ]);
}
