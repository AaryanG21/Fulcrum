import "server-only";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";

export async function findSharedScan(token: string, now: Date = new Date()) {
  if (token.length < 20 || token.length > 200) return null;

  const link = await prisma.shareLink.findFirst({
    where: { tokenHash: sha256(token), revokedAt: null, expiresAt: { gt: now } },
    select: {
      scan: {
        select: {
          status: true,
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
          createdAt: true,
        },
      },
    },
  });

  if (!link || link.scan.status !== "COMPLETED") return null;
  return link.scan;
}
