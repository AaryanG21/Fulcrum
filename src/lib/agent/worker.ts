import "server-only";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
import { errorMessage, log } from "@/lib/log";
import { runScan } from "@/lib/agent/run";
import { reapExpiredQueuedScans } from "@/lib/agent/reaper";
import { alertIfRegressed, enqueueDueSchedules } from "@/lib/agent/scheduler";
import type { Prisma } from "@/generated/prisma/client";

const POLL_INTERVAL_MS = 3_000;

const EXPIRY_EVERY_TICKS = 20;

interface ClaimedScan {
  id: string;
  userId: string;
  hostname: string;
  budgetLimit: number;
}

export async function claimNextScan(): Promise<ClaimedScan | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = await prisma.scanResult.findFirst({
      where: { status: "QUEUED" },
      orderBy: { createdAt: "asc" },
      select: { id: true, userId: true, hostname: true, budgetLimit: true },
    });

    if (!candidate) return null;

    const claimed = await prisma.scanResult.updateMany({
      where: { id: candidate.id, status: "QUEUED" },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    if (claimed.count === 1) return candidate;
  }

  return null;
}

export async function processScan(scan: ClaimedScan): Promise<void> {
  const fail = async (reason: string): Promise<void> => {
    await prisma.scanResult.update({
      where: { id: scan.id },
      data: {
        status: "FAILED",
        errorMessage: reason.slice(0, 500),
        completedAt: new Date(),
      },
    });

    await writeAudit({
      actorUserId: scan.userId,
      action: "SCAN_FAILED",
      targetType: "ScanResult",
      targetId: scan.id,
      metadata: { reason },
    });
  };

  try {
    const result = await runScan({
      hostname: scan.hostname,
      budgetLimit: scan.budgetLimit,
    });

    if (!result.ok) {
      await fail(result.reason);
      return;
    }

    const outcome = result.outcome;

    const injectionAttempts = outcome.findings.filter((f) => f.injectionAttempt);
    if (injectionAttempts.length > 0) {
      await writeAudit({
        actorUserId: scan.userId,
        action: "SCAN_INJECTION_ATTEMPT_IGNORED",
        targetType: "ScanResult",
        targetId: scan.id,
        metadata: {
          hostname: outcome.hostname,
          count: injectionAttempts.length,
          checkIds: injectionAttempts.map((f) => f.checkId).slice(0, 10),
          note: "Instruction-shaped text found in scanned content; scoring was unaffected.",
        },
      });
    }

    await prisma.scanResult.update({
      where: { id: scan.id },
      data: {
        status: "COMPLETED",
        findings: outcome.findings as unknown as Prisma.InputJsonValue,
        score: outcome.score,
        grade: outcome.grade,
        budgetUsed: outcome.plan.budgetUsed,
        remediationPlan: outcome.plan as unknown as Prisma.InputJsonValue,
        degradedSteps: outcome.degraded as unknown as Prisma.InputJsonValue,
        testsslVersion: outcome.testsslVersion,
        completedAt: outcome.completedAt,
      },
    });

    await writeAudit({
      actorUserId: scan.userId,
      action: "SCAN_COMPLETED",
      targetType: "ScanResult",
      targetId: scan.id,
      metadata: {
        hostname: outcome.hostname,
        grade: outcome.grade,
        findingCount: outcome.findings.length,
        degradedSteps: outcome.degraded.map((d) => d.step),
      },
    });

    void alertIfRegressed({
      id: scan.id,
      userId: scan.userId,
      hostname: outcome.hostname,
      grade: outcome.grade,
      score: outcome.score,
      findings: outcome.findings,
    });
  } catch (error) {
    log.error("scan job threw", { scanId: scan.id, error: errorMessage(error) });
    try {
      await fail("The scan stopped because of an internal error. No results were produced; this is not a clean result. Run it again.");
    } catch (secondary) {
      log.error("could not record scan failure", {
        scanId: scan.id,
        error: errorMessage(secondary),
      });
    }
  }
}

export async function fillSlots(
  state: { active: number },
  concurrency: number,
): Promise<number> {
  let started = 0;

  while (state.active < concurrency) {
    const scan = await claimNextScan();
    if (!scan) break;

    state.active++;
    started++;

    void processScan(scan).finally(() => {
      state.active--;
    });
  }

  return started;
}

const globalForWorker = globalThis as unknown as { __fulcrumScanWorker?: boolean };

export function startScanWorker(): void {
  if (globalForWorker.__fulcrumScanWorker) return;
  globalForWorker.__fulcrumScanWorker = true;

  const concurrency = getEnv().SCAN_CONCURRENCY;
  const state = { active: 0 };
  let ticking = false;
  let tickCount = 0;

  const timer = setInterval(() => {
    if (ticking) return;
    ticking = true;

    const slowTick = ++tickCount % EXPIRY_EVERY_TICKS === 0;
    const expiry = slowTick
      ? reapExpiredQueuedScans()
          .then(() => enqueueDueSchedules())
          .then(() => undefined)
      : Promise.resolve();

    expiry
      .then(() => fillSlots(state, concurrency))
      .catch((error) => {
        log.error("scan worker tick failed", { error: errorMessage(error) });
      })
      .finally(() => {
        ticking = false;
      });
  }, POLL_INTERVAL_MS);

  timer.unref();

  log.info("scan worker started", { concurrency });
}
