"use client";

export interface ApiFailure {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  status: number;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiFailure };

let csrfToken: string | null = null;

async function getCsrfToken(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken;

  const response = await fetch("/api/auth/csrf", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await response.json()) as { csrfToken: string };
  csrfToken = body.csrfToken;
  return csrfToken;
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };

  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
    headers["X-CSRF-Token"] = await getCsrfToken();
  }

  let response = await fetch(path, {
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store",
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  if (response.status === 403 && method !== "GET") {
    const cloned = response.clone();
    const maybe = (await cloned.json().catch(() => null)) as
      | { error?: { code?: string } }
      | null;

    if (maybe?.error?.code === "csrf_failed") {
      headers["X-CSRF-Token"] = await getCsrfToken(true);
      response = await fetch(path, {
        method,
        headers,
        credentials: "same-origin",
        cache: "no-store",
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      });
    }
  }

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: { code: string; message: string; details?: Record<string, string[]> } })
    | null;

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: payload?.error?.code ?? "request_failed",
        message: payload?.error?.message ?? "Something went wrong.",
        details: payload?.error?.details,
        status: response.status,
      },
    };
  }

  return { ok: true, data: payload as T };
}
