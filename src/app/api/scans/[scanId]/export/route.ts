import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> },
) {
  const guard = await requireUser(request, { skipCsrf: true, rateLimit: "api" });
  if (!guard.ok) return guard.response;

  const { scanId } = await context.params;

  const scan = await prisma.scanResult.findFirst({
    where: { id: scanId, userId: guard.value.id, status: "COMPLETED" },
    select: {
      id: true,
      hostname: true,
      scanType: true,
      grade: true,
      score: true,
      findings: true,
      remediationPlan: true,
      degradedSteps: true,
      testsslVersion: true,
      budgetLimit: true,
      budgetUsed: true,
      completedAt: true,
    },
  });

  if (!scan) return apiError(404, "not_found", "No such scan.");

  const body = JSON.stringify(
    {
      exportedBy: "Fulcrum",
      note: "A grade reflects only the checks Fulcrum runs. It is not a statement that a site is or is not secure.",
      scan,
    },
    null,
    2,
  );

  const safeName = scan.hostname.replace(/[^a-z0-9.-]/gi, "_").slice(0, 80);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="fulcrum-${safeName}-${scan.id.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
