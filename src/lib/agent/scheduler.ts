import "server-only";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
import { errorMessage, log } from "@/lib/log";
import { authorizeScan } from "@/lib/domains/allowlist";
import { sendEmail } from "@/lib/email/send";
import { regressionMessage, schedulePausedMessage, appLink } from "@/lib/email/templates";
import { compareScans } from "@/lib/scans/compare";
import { SEVERITY_ORDER, type Finding } from "@/lib/agent/types";

const MAX_PER_TICK = 20;

const ALERT_SERIOUS: ReadonlyArray<Finding["severity"]> = ["HIGH", "CRITICAL"];

export async function enqueueDueSchedules(now: Date = new Date()): Promise<number> {
  const env = getEnv();

  const due = await prisma.scanSchedule.findMany({
    where: { enabled: true, nextRunAt: { lte: now } },
    orderBy: { nextRunAt: "asc" },
    take: MAX_PER_TICK,
    select: {
      id: true,
      userId: true,
      domainId: true,
      intervalDays: true,
      budget: true,
      domain: { select: { hostname: true } },
      user: { select: { email: true, status: true } },
    },
  });

  let queued = 0;

  for (const schedule of due) {
    try {
      const waiting = await prisma.scanResult.count({ where: { status: "QUEUED" } });
      if (waiting >= env.SCAN_QUEUE_MAX_DEPTH) break;

      const next = new Date(now.getTime() + schedule.intervalDays * 86_400_000);

      const claimed = await prisma.scanSchedule.updateMany({
        where: { id: schedule.id, enabled: true, nextRunAt: { lte: now } },
        data: { nextRunAt: next, lastRunAt: now },
      });
      if (claimed.count !== 1) continue;

      const authorization = await authorizeScan({
        userId: schedule.userId,
        userStatus: schedule.user.status,
        domainId: schedule.domainId,
      });

      if (!authorization.granted) {
        await prisma.scanSchedule.update({
          where: { id: schedule.id },
          data: { enabled: false, pausedReason: authorization.message.slice(0, 300) },
        });
        await writeAudit({
          actorUserId: schedule.userId,
          action: "SCAN_SCHEDULE_PAUSED",
          targetType: "Domain",
          targetId: schedule.domainId,
          metadata: { reason: authorization.reason, hostname: schedule.domain.hostname },
        });
        void sendEmail(
          schedulePausedMessage({
            to: schedule.user.email,
            hostname: schedule.domain.hostname,
            reason: authorization.message,
          }),
        ).catch((error) =>
          log.error("could not send schedule-paused email", { error: errorMessage(error) }),
        );
        continue;
      }

      const scan = await prisma.scanResult.create({
        data: {
          domainId: authorization.domainId,
          userId: schedule.userId,
          hostname: authorization.hostname,
          scanType: "FULL",
          status: "QUEUED",
          budgetLimit: schedule.budget,
        },
        select: { id: true },
      });

      await writeAudit({
        actorUserId: schedule.userId,
        action: "SCAN_REQUESTED",
        targetType: "Domain",
        targetId: authorization.domainId,
        metadata: {
          scanId: scan.id,
          hostname: authorization.hostname,
          budget: schedule.budget,
          scheduled: true,
        },
      });

      queued += 1;
    } catch (error) {
      log.error("could not enqueue a scheduled scan", {
        scheduleId: schedule.id,
        error: errorMessage(error),
      });
    }
  }

  return queued;
}

export async function alertIfRegressed(scan: {
  id: string;
  userId: string;
  hostname: string;
  grade: string;
  score: number;
  findings: Finding[];
}): Promise<void> {
  try {
    const schedule = await prisma.scanSchedule.findFirst({
      where: {
        userId: scan.userId,
        enabled: true,
        notifyOnRegression: true,
        domain: { hostname: scan.hostname },
      },
      select: { id: true, user: { select: { email: true } } },
    });
    if (!schedule) return;

    const current = await prisma.scanResult.findUnique({
      where: { id: scan.id },
      select: { createdAt: true },
    });
    if (!current) return;

    const previous = await prisma.scanResult.findFirst({
      where: {
        userId: scan.userId,
        hostname: scan.hostname,
        scanType: "FULL",
        status: "COMPLETED",
        createdAt: { lt: current.createdAt },
      },
      orderBy: { createdAt: "desc" },
      select: { grade: true, score: true, findings: true },
    });
    if (!previous || previous.score === null || !previous.grade) return;

    const comparison = compareScans(previous.findings as unknown as Finding[], scan.findings);
    const newSerious = comparison.added.filter((f) => ALERT_SERIOUS.includes(f.severity));
    const fell = scan.score < previous.score;

    if (!fell && newSerious.length === 0) return;

    await sendEmail(
      regressionMessage({
        to: schedule.user.email,
        hostname: scan.hostname,
        previousGrade: previous.grade,
        newGrade: scan.grade,
        previousScore: previous.score,
        newScore: scan.score,
        newFindings: comparison.added
          .slice()
          .sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity])
          .map((f) => f.title),
        link: appLink(`/scans/${scan.id}`),
      }),
    );
  } catch (error) {
    log.error("could not send regression alert", { error: errorMessage(error) });
  }
}
