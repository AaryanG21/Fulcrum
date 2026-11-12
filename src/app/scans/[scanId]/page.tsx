import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui";
import { Scorecard } from "@/components/scorecard";
import { ScanStatusWatcher } from "./scan-status-watcher";
import { ScanActions } from "@/components/scan-actions";
import { compareScans } from "@/lib/scans/compare";
import type { Finding, Grade, RemediationPlan } from "@/lib/agent/types";
import { loginRedirectUrl } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scorecard" };

export default async function ScanPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect(loginRedirectUrl(`/scans/${(await params).scanId}`));

  const { scanId } = await params;

  const scan = await prisma.scanResult.findFirst({
    where: { id: scanId, userId: session.id },
    select: {
      id: true,
      hostname: true,
      scanType: true,
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
    },
  });

  if (!scan) notFound();

  const isAdmin = session.role === "ADMIN";

  if (scan.status !== "COMPLETED") {
    return (
      <AppShell email={session.email} isAdmin={isAdmin} active="dashboard">
        <Panel as="h1" title={`Scan of ${scan.hostname}`}>
          <p className="text-sm text-ink-muted">
            This scan is <span className="font-mono text-ink">{scan.status.toLowerCase()}</span>.
          </p>
          {scan.refusalReason && (
            <p className="mt-2 text-sm text-sev-high">
              Refused: {scan.refusalReason.replaceAll("_", " ")}. Fulcrum only
              scans domains you have registered and verified.
            </p>
          )}
          {scan.errorMessage && (
            <p className="mt-2 text-sm text-sev-critical">{scan.errorMessage}</p>
          )}
          {(scan.status === "RUNNING" || scan.status === "QUEUED") && (
            <ScanStatusWatcher
              scanId={scan.id}
              status={scan.status}
              startedAtMs={(scan.startedAt ?? scan.createdAt).getTime()}
            />
          )}
          <Link
            href="/dashboard"
            className="mt-4 inline-flex text-sm text-signal-ink hover:underline"
          >
            Back to dashboard
          </Link>
        </Panel>
      </AppShell>
    );
  }

  const findings = (scan.findings ?? []) as unknown as Finding[];
  const plan = (scan.remediationPlan ?? {
    budgetLimit: scan.budgetLimit,
    budgetUsed: scan.budgetUsed,
    steps: [],
    deferred: [],
    projectedScore: scan.score ?? 0,
    projectedGrade: (scan.grade ?? "F") as Grade,
    strategy: "No plan was stored for this scan.",
  }) as unknown as RemediationPlan;

  const degraded = (scan.degradedSteps ?? []) as unknown as Array<{
    step: string;
    reason: string;
  }>;

  const previous = await prisma.scanResult.findFirst({
    where: {
      userId: session.id,
      hostname: scan.hostname,
      scanType: scan.scanType,
      status: "COMPLETED",
      createdAt: { lt: scan.createdAt },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      grade: true,
      score: true,
      findings: true,
      completedAt: true,
      createdAt: true,
    },
  });

  const changes =
    previous && previous.grade && previous.score !== null
      ? {
          previous: {
            id: previous.id,
            grade: previous.grade,
            score: previous.score,
            scannedAt: (previous.completedAt ?? previous.createdAt)
              .toISOString()
              .slice(0, 16)
              .replace("T", " "),
          },
          comparison: compareScans(
            (previous.findings ?? []) as unknown as Finding[],
            findings,
          ),
        }
      : undefined;

  const activeLinks = await prisma.shareLink.count({
    where: {
      scanId: scan.id,
      userId: session.id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  return (
    <AppShell email={session.email} isAdmin={isAdmin} active="dashboard">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-muted print:hidden">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/dashboard" className="hover:text-ink hover:underline">
              Dashboard
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/scans" className="hover:text-ink hover:underline">
              Scan history
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-mono text-ink">
            {scan.hostname}
          </li>
        </ol>
      </nav>

      <ScanActions scanId={scan.id} activeLinks={activeLinks} />

      <Scorecard
        hostname={scan.hostname}
        scanType={scan.scanType}
        grade={(scan.grade ?? "F") as Grade}
        score={scan.score ?? 0}
        findings={findings}
        plan={plan}
        testsslVersion={scan.testsslVersion}
        degraded={degraded}
        scannedAt={(scan.completedAt ?? scan.createdAt)
          .toISOString()
          .slice(0, 16)
          .replace("T", " ")}
        changes={changes}
      />
    </AppShell>
  );
}
