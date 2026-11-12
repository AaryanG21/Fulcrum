"use client";

import { useEffect, useState } from "react";
import { Clock } from "@/components/icons";
import { IndeterminateBar } from "@/components/ui";

const STAGES = [
  "HTTP response headers",
  "Software fingerprint, from those headers",
  "CVE and EPSS cross-reference",
  "TLS configuration via testssl.sh",
] as const;

const OVERTIME_SECONDS = 180;

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ScanProgress({
  startedAtMs,
  queued = false,
}: {
  startedAtMs: number;
  queued?: boolean;
}) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAtMs]);

  const overtime = elapsed >= OVERTIME_SECONDS;

  const announcement = queued
    ? "Scan queued. It will start when a slot is free."
    : overtime
      ? "Scan still running, longer than is typical."
      : "Scan running. This usually takes two to three minutes.";

  return (
    <div className="glass-2 mt-4 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-ink">
          <Clock className="h-4 w-4 text-signal-ink" />
          {queued ? "Waiting in the queue" : overtime ? "Still running" : "Scanning"}
        </span>
        <span className="font-mono text-sm text-ink-muted" aria-hidden="true">
          {formatElapsed(elapsed)}
        </span>
      </div>

      <div className="mt-3">
        <IndeterminateBar />
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {!queued && (
      <ol className="mt-4 space-y-1.5">
        {STAGES.map((stage, index) => (
          <li key={stage} className="flex gap-2 text-xs text-ink-faint">
            <span className="font-mono text-ink-faint">{index + 1}.</span>
            {stage}
          </li>
        ))}
      </ol>
      )}

      <p className="mt-3 border-t border-line pt-3 text-xs text-ink-faint">
        {queued
          ? "Your scan will start as soon as a slot is free. The result is written to your history whether or not this tab stays open."
          : overtime
          ? "This is longer than a typical run. The scan is still going; the result is written to your history whether or not this tab stays open."
          : "The TLS stage dominates the runtime. Fulcrum does not report per-stage progress — the elapsed time above is measured, but the list is the pipeline, not a position in it."}
      </p>
    </div>
  );
}
