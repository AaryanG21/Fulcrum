import { apiOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const response = apiOk({ status: "ok" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
