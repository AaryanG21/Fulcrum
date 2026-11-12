const MAX_LENGTH = 512;

const REFUSED_PREFIXES = ["/api", "/login", "/register", "/enroll", "/forgot-password", "/reset-password", "/verify-email"];

export function safeNextPath(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_LENGTH) {
    return null;
  }

  if (!value.startsWith("/")) return null;

  if (value.startsWith("//") || value.startsWith("/\\")) return null;

  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;

  let resolved: URL;
  try {
    resolved = new URL(value, "http://same-origin.invalid");
  } catch {
    return null;
  }
  if (resolved.origin !== "http://same-origin.invalid") return null;

  const path = resolved.pathname;
  if (REFUSED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return null;
  }

  return resolved.pathname + resolved.search;
}

export function loginRedirectUrl(path: string): string {
  const safe = safeNextPath(path);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}
