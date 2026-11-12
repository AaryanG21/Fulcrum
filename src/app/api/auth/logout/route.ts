import { type NextRequest } from "next/server";
import { apiOk, getRequestMeta } from "@/lib/http";
import { enforceCsrf } from "@/lib/auth/guards";
import { endSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const blocked = await enforceCsrf(request);
  if (blocked) return blocked;

  await endSession(getRequestMeta(request));

  return apiOk({ status: "signed_out" });
}
