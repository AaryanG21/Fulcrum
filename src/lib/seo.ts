export const INDEXABLE_PATHS = [
  "/",
  "/login",
  "/register",
  "/privacy",
  "/terms",
  "/cookies",
] as const;

const NOINDEX_PREFIXES = [
  "/api",
  "/dashboard",
  "/admin",
  "/account",
  "/scans",
  "/enroll",
  "/verify-email",
  "/reset-password",
  "/forgot-password",
  "/r",
] as const;

export function isNoIndexPath(pathname: string): boolean {
  return NOINDEX_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
