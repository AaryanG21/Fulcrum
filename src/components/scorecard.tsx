import { FindingsList, type FindingSeverity } from "@/components/findings-list";
import { Badge, Panel } from "@/components/ui";
import { BudgetMeter, RiskBar, ScoreGauge, SeverityBar } from "@/components/viz";
import { severityBreakdown, worstSeverity } from "@/lib/agent/scoring";
import { CVE_COVERAGE_NOTE } from "@/lib/agent/cve-dataset";
import { FixGuide } from "@/components/fix-guide";
import { ScanChanges, type PreviousScan } from "@/components/scan-changes";
import type { ScanComparison } from "@/lib/scans/compare";
import type { Finding, Grade, RemediationPlan, Severity } from "@/lib/agent/types";

const SEVERITY_FLOOR_LABEL: Record<Severity, string> = {
  CRITICAL: "F",
  HIGH: "D",
  MEDIUM: "C",
  LOW: "B",
  INFO: "A",
};

const SEVERITY_TONE = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "neutral",
} as const;

export function Scorecard({
  hostname,
  grade,
  score,
  findings,
  plan,
  testsslVersion,
  degraded,
  scannedAt,
  scanType = "FULL",
  changes,
}: {
  hostname: string;
  grade: Grade;
  score: number;
  findings: Finding[];
  plan: RemediationPlan;
  testsslVersion: string | null;
  degraded: Array<{ step: string; reason: string }>;
  scannedAt: string;
  scanType?: "FULL" | "HEADERS_ONLY";
  changes?: { previous: PreviousScan; comparison: ScanComparison };
}) {
  const counts = severityBreakdown(findings);
  const scored = findings.filter((f) => f.severity !== "INFO");
  const informational = findings.filter((f) => f.severity === "INFO");
  const injectionCount = findings.filter((f) => f.injectionAttempt).length;
  const worst = worstSeverity(findings);

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <div className="shrink-0">
            <ScoreGauge score={score} grade={grade} />
          </div>

          <div className="min-w-64 flex-1">
            <h1 className="display text-2xl break-words text-ink sm:text-4xl">{hostname}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Score {score}/100 · {scored.length} finding
              {scored.length === 1 ? "" : "s"} · scanned {scannedAt}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {scanType === "HEADERS_ONLY" && (
                <Badge tone="medium">headers only</Badge>
              )}
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Severity[])
                .filter((s) => counts[s] > 0)
                .map((s) => (
                  <Badge key={s} tone={SEVERITY_TONE[s]}>
                    {counts[s]} {s.toLowerCase()}
                  </Badge>
                ))}
              {scored.length === 0 && <Badge tone="signal">no findings</Badge>}
            </div>

            <SeverityBar
              className="mt-3 h-1.5 w-full"
              counts={{
                critical: counts.CRITICAL,
                high: counts.HIGH,
                medium: counts.MEDIUM,
                low: counts.LOW,
              }}
            />
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
          {scanType === "HEADERS_ONLY" && (
            <p className="text-sev-medium">
              This was a headers-only check of a host nobody has proved they
              control, so it made a single request and read the response
              headers. TLS and certificate configuration were{" "}
              <strong className="font-semibold">not examined</strong> — this
              grade describes the HTTP headers and nothing else, and a host
              with excellent headers can still have badly broken transport
              security. Verify ownership to run the full scan.
            </p>
          )}
          {worst && (
            <p>
              The score is a penalty total: the worst finding counts in full
              and each subsequent one counts for less. The letter is then
              held to what was actually found — with nothing above{" "}
              <span className="text-ink-muted">{worst.toLowerCase()}</span>{" "}
              severity here, this cannot grade below{" "}
              <span className="font-mono text-ink-muted">
                {SEVERITY_FLOOR_LABEL[worst]}
              </span>
              , however many findings accumulate. An F is reserved for a
              critical one.
            </p>
          )}

          <p>
            This grade reflects the checks Fulcrum ran against what is
            reachable from outside: HTTP response headers, TLS configuration,
            and self-reported software versions. It does not assess
            application logic, dependencies, infrastructure, or access
            control. A good grade means these checks found nothing — not that
            the site is secure.
          </p>
        </div>
      </section>

      {degraded.length > 0 && (
        <Panel
          title="Incomplete checks"
          description="These steps did not produce results. Their absence is not a pass."
        >
          <ul className="space-y-2 text-sm">
            {degraded.map((item) => (
              <li key={item.step} className="flex gap-3">
                <span className="font-mono text-xs text-sev-medium uppercase">
                  {item.step}
                </span>
                <span className="text-ink-muted">{item.reason}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {injectionCount > 0 && (
        <Panel title="Instruction-shaped content detected">
          <p className="text-sm text-ink-muted">
            {injectionCount} piece{injectionCount === 1 ? "" : "s"} of content
            returned by this host contained text that reads like an
            instruction to an automated reader — for example, asking a scanner
            to disregard its findings.
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            It had no effect. Scores are computed from the checks that ran, and
            text from a scanned target is never interpreted as input to that
            computation. The content is shown below as evidence, marked with a
            flag.
          </p>
        </Panel>
      )}

      {changes && (
        <ScanChanges
          previous={changes.previous}
          currentGrade={grade}
          currentScore={score}
          comparison={changes.comparison}
        />
      )}

      <Panel
        title="Remediation plan"
        description={plan.strategy}
        action={
          <div className="text-right">
            <div className="font-mono text-sm text-ink">
              {plan.budgetUsed}/{plan.budgetLimit} pts
            </div>
            <BudgetMeter
              className="mt-1 ml-auto h-1 w-28"
              used={plan.budgetUsed}
              limit={plan.budgetLimit}
            />
            <div className="mt-1 text-xs text-ink-faint">
              projects to {plan.projectedGrade} ({plan.projectedScore})
            </div>
          </div>
        }
      >
        {plan.steps.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Nothing fits this budget. Raise it to get a ranked plan.
          </p>
        ) : (
          <ol className="space-y-4">
            {plan.steps.map((step) => (
              <li
                key={step.checkId}
                className="glass-2 rounded-xl p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono text-sm text-signal-ink">
                      {step.rank}.
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm text-ink-muted">{step.action}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={SEVERITY_TONE[step.severity]}>
                      {step.severity.toLowerCase()}
                    </Badge>
                    <Badge>{step.effort} pts</Badge>
                  </div>
                </div>

                <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-faint">
                  <span className="text-ink-muted">Why here: </span>
                  {step.reasoning}
                </p>
              </li>
            ))}
          </ol>
        )}

        {plan.deferred.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="font-mono text-xs tracking-wide text-ink-faint uppercase">
              Did not fit the budget
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {plan.deferred.map((item) => (
                <li key={item.checkId} className="flex flex-wrap gap-2">
                  <span className="text-ink-muted">{item.title}</span>
                  <span className="text-xs text-ink-faint">
                    — {item.effort} pts, {item.reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <Panel title="Findings" description="Ranked by computed risk. Filter by severity to focus.">
        {scored.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No findings from the checks that completed.
          </p>
        ) : (
          <FindingsList
            items={scored.map((finding) => ({
              id: finding.checkId,
              severity: finding.severity as FindingSeverity,
              node: (
                <article className="glass-2 rounded-xl p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={SEVERITY_TONE[finding.severity]}>
                          {finding.severity.toLowerCase()}
                        </Badge>
                        <span className="font-mono text-xs text-ink-faint">
                          {finding.source}
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-base font-semibold tracking-tight text-ink">
                        {finding.title}
                      </h3>
                    </div>

                    <dl className="flex shrink-0 gap-6 text-right">
                      <div>
                        <dt className="eyebrow text-ink-faint">Risk</dt>
                        <dd className="mt-1 font-mono text-lg text-ink">
                          {finding.riskScore}
                          <RiskBar
                            className="mt-1 ml-auto h-1 w-12"
                            risk={finding.riskScore}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="eyebrow text-ink-faint">Effort</dt>
                        <dd className="mt-1 font-mono text-lg text-ink-muted">
                          {finding.effort}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                    {finding.description}
                  </p>
                  <FixGuide checkId={finding.checkId} />
                  {finding.evidence && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-ink-faint hover:text-ink-muted">
                        Evidence from the target
                        {finding.injectionAttempt && (
                          <span className="ml-2 text-sev-high">
                            <span aria-hidden>⚑ </span>instruction-shaped, ignored
                          </span>
                        )}
                      </summary>
                      <code className="mt-1.5 block overflow-x-auto rounded-lg border border-line bg-base/60 px-2.5 py-2 font-mono text-xs break-all whitespace-pre-wrap text-ink-muted">
                        {finding.evidence}
                      </code>
                    </details>
                  )}
                </article>
              ),
            }))}
          />
        )}
      </Panel>

      <Panel title="How this was measured">
        <dl className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <dt className="text-ink-faint">TLS scanner:</dt>
            <dd className="text-ink-muted">
              {testsslVersion
                ? `testssl.sh v${testsslVersion} (pinned)`
                : "testssl.sh did not complete for this scan"}
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-ink-faint">Risk model:</dt>
            <dd className="text-ink-muted">
              severity × exploitability × exposure, scaled to 0–100. EPSS
              supplies exploitability for CVE-backed findings.
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-ink-faint">Ordering:</dt>
            <dd className="text-ink-muted">
              risk removed per effort point, filled greedily against your
              budget.
            </dd>
          </div>
        </dl>

        <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-faint">
          {CVE_COVERAGE_NOTE}
        </p>

        {informational.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <h3 className="font-mono text-xs tracking-wide text-ink-faint uppercase">
              Identified software
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-ink-muted">
              {informational.map((item) => (
                <li key={item.checkId}>
                  {item.title}
                  <span className="ml-2 text-xs text-ink-faint">
                    (self-reported by the target)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
}
