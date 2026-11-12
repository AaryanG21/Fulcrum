"use client";

import { useState, type ReactNode } from "react";

export type FindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const ORDER: FindingSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const ON_CLASS: Record<FindingSeverity, string> = {
  CRITICAL: "border-sev-critical/60 bg-sev-critical/15 text-sev-critical",
  HIGH: "border-sev-high/60 bg-sev-high/15 text-sev-high",
  MEDIUM: "border-sev-medium/60 bg-sev-medium/15 text-sev-medium",
  LOW: "border-sev-low/60 bg-sev-low/15 text-sev-low",
};

export function FindingsList({
  items,
}: {
  items: Array<{ id: string; severity: FindingSeverity; node: ReactNode }>;
}) {
  const [selected, setSelected] = useState<Set<FindingSeverity>>(new Set());

  const counts = ORDER.map((severity) => ({
    severity,
    count: items.filter((item) => item.severity === severity).length,
  })).filter((entry) => entry.count > 0);

  const visible =
    selected.size === 0 ? items : items.filter((item) => selected.has(item.severity));

  const toggle = (severity: FindingSeverity) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(severity)) next.delete(severity);
      else next.add(severity);
      return next;
    });
  };

  return (
    <div>
      {counts.length > 1 && (
        <div
          role="group"
          aria-label="Filter findings by severity"
          className="mb-5 flex flex-wrap items-center gap-2 print:hidden"
        >
          <span className="eyebrow mr-1 text-ink-faint">Show</span>
          {counts.map(({ severity, count }) => {
            const on = selected.has(severity);
            return (
              <button
                key={severity}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(severity)}
                className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                  on
                    ? ON_CLASS[severity]
                    : "border-line-bright/60 text-ink-muted hover:border-line-bright hover:text-ink"
                }`}
              >
                {severity.toLowerCase()} · {count}
              </button>
            );
          })}
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-full px-2 py-1 text-xs text-signal-ink underline-offset-2 hover:underline"
            >
              Show all
            </button>
          )}
        </div>
      )}

      <p role="status" className="sr-only">
        Showing {visible.length} of {items.length} findings.
      </p>

      <ol className="space-y-3">
        {visible.map((item) => (
          <li key={item.id}>{item.node}</li>
        ))}
      </ol>
    </div>
  );
}
