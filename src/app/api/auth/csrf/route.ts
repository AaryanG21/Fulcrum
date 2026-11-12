import { NextResponse } from "next/server";
import { issueCsrfToken } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const token = await issueCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
