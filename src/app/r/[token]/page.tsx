import { notFound } from "next/navigation";
import Link from "next/link";
import { findSharedScan } from "@/lib/scans/share";
import { Scorecard } from "@/components/scorecard";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import type { Finding, Grade, RemediationPlan } from "@/lib/agent/types";

export const metadata = {
  title: "Shared scorecard",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export const dynamic = "force-dynamic";

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const scan = await findSharedScan(token);
  if (!scan) notFound();

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
  const degraded = (scan.degradedSteps ?? []) as unknown as Array<{ step: string; reason: string }>;

  const scannedAt = (scan.completedAt ?? scan.createdAt)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-base font-semibold tracking-tight text-ink">
              Fulcrum
            </span>
          </Link>
          <Link href="/" className="text-sm text-signal-ink hover:underline print:hidden">
            Check your own site
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 focus:outline-none">
        <p className="mb-6 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
          A read-only scorecard shared by a Fulcrum user. It shows the state of the site on{" "}
          {scannedAt} UTC and may be out of date. A grade reflects only the checks Fulcrum
          runs; it is not a statement that a site is or is not secure.
        </p>

        <Scorecard
          hostname={scan.hostname}
          scanType={scan.scanType}
          grade={(scan.grade ?? "F") as Grade}
          score={scan.score ?? 0}
          findings={findings}
          plan={plan}
          testsslVersion={scan.testsslVersion}
          degraded={degraded}
          scannedAt={scannedAt}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
