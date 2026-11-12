import { NextResponse, type NextRequest } from "next/server";
import { securityHeaders } from "@/lib/security/headers";
import { isNoIndexPath } from "@/lib/seo";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookie-names";
import { loginRedirectUrl } from "@/lib/safe-redirect";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const isHttps = (process.env.APP_ORIGIN ?? "").startsWith("https://");

  const requestHeaders = new Headers(request.headers);

  requestHeaders.delete("x-fulcrum-user");

  requestHeaders.delete("x-request-id");
  const requestId = crypto.randomUUID();
  requestHeaders.set("x-request-id", requestId);

  const { pathname, search } = request.nextUrl;
  const needsSignIn = ["/dashboard", "/admin", "/account", "/scans"].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const hasAuthCookie =
    request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);

  const response =
    needsSignIn && !hasAuthCookie
      ? NextResponse.redirect(new URL(loginRedirectUrl(pathname + search), request.url))
      : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);

  if (isNoIndexPath(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  for (const [key, value] of Object.entries(
    securityHeaders({ nonce, isDev, isHttps }),
  )) {
    if (value) response.headers.set(key, value);
    else response.headers.delete(key);
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
