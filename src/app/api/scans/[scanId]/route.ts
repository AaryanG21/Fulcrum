import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/http";
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
    where: { id: scanId, userId: guard.value.id },
    select: {
      id: true,
      status: true,
      findings: true,
      score: true,
      grade: true,
      budgetLimit: true,
      budgetUsed: true,
      remediationPlan: true,
      degradedSteps: true,
      testsslVersion: true,
      refusalReason: true,
      errorMessage: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      domain: { select: { hostname: true } },
    },
  });

  if (!scan) return apiError(404, "not_found", "No such scan.");

  const response = apiOk({ scan });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
