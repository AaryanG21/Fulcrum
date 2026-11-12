import Link from "next/link";
import { Badge, Panel } from "@/components/ui";
import { isImprovement, type ScanComparison } from "@/lib/scans/compare";
import type { Severity } from "@/lib/agent/types";

const TONE = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "neutral",
} as const satisfies Record<Severity, string>;

export interface PreviousScan {
  id: string;
  grade: string;
  score: number;
  scannedAt: string;
}

export function ScanChanges({
  previous,
  currentGrade,
  currentScore,
  comparison,
}: {
  previous: PreviousScan;
  currentGrade: string;
  currentScore: number;
  comparison: ScanComparison;
}) {
  const delta = currentScore - previous.score;
  const sign = delta > 0 ? "+" : "";
  const nothingChanged =
    comparison.added.length === 0 &&
    comparison.resolved.length === 0 &&
    comparison.shifted.length === 0;

  let headline: string;
  if (nothingChanged) headline = "No change in findings since the previous scan.";
  else if (isImprovement(comparison))
    headline = `${comparison.resolved.length} finding${comparison.resolved.length === 1 ? "" : "s"} fixed, nothing new.`;
  else headline = "Findings have changed since the previous scan.";

  return (
    <Panel
      title="Since your previous scan"
      description={`Compared with the scan of ${previous.scannedAt}.`}
      action={
        <Link href={`/scans/${previous.id}`} className="text-sm text-signal-ink hover:underline">
          View previous
        </Link>
      }
    >
      <p className="font-mono text-sm text-ink">
        Grade {previous.grade} <span aria-hidden>→</span>
        <span className="sr-only"> to </span> {currentGrade}
        <span className="mx-2 text-ink-faint">·</span>
        Score {previous.score} <span aria-hidden>→</span>
        <span className="sr-only"> to </span> {currentScore}{" "}
        <span className="text-ink-muted">
          ({sign}
          {delta})
        </span>
      </p>
      <p className="mt-2 text-sm text-ink-muted">{headline}</p>

      {comparison.resolved.length > 0 && (
        <section className="mt-4" aria-label="Resolved findings">
          <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Resolved
          </h3>
          <ul className="mt-2 space-y-1.5">
            {comparison.resolved.map((f) => (
              <li key={f.checkId} className="flex flex-wrap items-center gap-2 text-sm text-ink">
                <Badge tone="signal">fixed</Badge>
                <span>{f.title}</span>
                <span className="text-xs text-ink-faint">was {f.severity.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {comparison.added.length > 0 && (
        <section className="mt-4" aria-label="New findings">
          <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">New</h3>
          <ul className="mt-2 space-y-1.5">
            {comparison.added.map((f) => (
              <li key={f.checkId} className="flex flex-wrap items-center gap-2 text-sm text-ink">
                <Badge tone={TONE[f.severity]}>{f.severity.toLowerCase()}</Badge>
                <span>{f.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {comparison.shifted.length > 0 && (
        <section className="mt-4" aria-label="Findings whose severity changed">
          <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Severity changed
          </h3>
          <ul className="mt-2 space-y-1.5">
            {comparison.shifted.map((f) => (
              <li key={f.checkId} className="flex flex-wrap items-center gap-2 text-sm text-ink">
                <Badge tone={TONE[f.to]}>{f.to.toLowerCase()}</Badge>
                <span>{f.title}</span>
                <span className="text-xs text-ink-faint">
                  was {f.from.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {comparison.unchanged > 0 && (
        <p className="mt-4 text-xs text-ink-faint">
          {comparison.unchanged} finding{comparison.unchanged === 1 ? "" : "s"} unchanged.
        </p>
      )}
    </Panel>
  );
}
