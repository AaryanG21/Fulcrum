"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { ScoreGauge } from "@/components/viz";
import { Alert, Badge, Busy, buttonClass, inputClass } from "@/components/ui";

interface Summary {
  hostname: string;
  grade: string;
  score: number;
  findingCount: number;
  counts: { critical: number; high: number; medium: number; low: number };
  top: Array<{ title: string; severity: string; remediation: string }>;
  incomplete: boolean;
  cached: boolean;
}

const TONE = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export function TryIt() {
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Summary | null>(null);

  async function check(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    const response = await apiFetch<Summary>("/api/try", {
      method: "POST",
      body: { hostname },
    });

    setBusy(false);

    if (!response.ok) {
      setError(response.error.message);
      return;
    }
    setResult(response.data);
  }

  return (
    <div className="glass rounded-2xl p-6 sm:p-8">
      <h2 className="display text-2xl text-ink">Try it on any site</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        Type a hostname. Fulcrum makes one ordinary HTTPS request to it, the same as a browser
        opening the page, reads the security headers in the response, and grades them. Nothing
        is stored and no account is needed.
      </p>

      <form method="post" onSubmit={check} aria-busy={busy} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1">
          <label htmlFor="try-host" className="block text-sm font-medium text-ink">
            Hostname
          </label>
          <input
            id="try-host"
            className={`${inputClass} mt-1.5 font-mono`}
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder="example.com"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            required
          />
        </div>
        <button type="submit" className={buttonClass} disabled={busy}>
          {busy ? <Busy>Checking…</Busy> : "Check headers"}
        </button>
      </form>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {result && (
        <div className="mt-6 border-t border-line pt-6" aria-live="polite">
          <div className="flex flex-wrap items-center gap-6">
            <ScoreGauge score={result.score} grade={result.grade} />
            <div>
              <p className="font-mono text-lg text-ink">{result.hostname}</p>
              <p className="text-sm text-ink-muted">
                Score {result.score}/100 · {result.findingCount} finding
                {result.findingCount === 1 ? "" : "s"}
                {result.cached && " · from a check in the last 15 minutes"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.counts.critical > 0 && <Badge tone="critical">{result.counts.critical} critical</Badge>}
                {result.counts.high > 0 && <Badge tone="high">{result.counts.high} high</Badge>}
                {result.counts.medium > 0 && <Badge tone="medium">{result.counts.medium} medium</Badge>}
                {result.counts.low > 0 && <Badge tone="low">{result.counts.low} low</Badge>}
                {result.findingCount === 0 && <Badge tone="signal">no findings</Badge>}
              </div>
            </div>
          </div>

          {result.top.length > 0 && (
            <>
              <h3 className="mt-6 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                Worst findings
              </h3>
              <ul className="mt-2 space-y-3">
                {result.top.map((f) => (
                  <li key={f.title} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={TONE[f.severity as keyof typeof TONE] ?? "neutral"}>
                        {f.severity.toLowerCase()}
                      </Badge>
                      <span className="font-medium text-ink">{f.title}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{f.remediation}</p>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-6 text-xs leading-relaxed text-ink-faint">
            This is a headers-only result and a summary of it.
            {result.incomplete && " Some checks could not be completed."} It does not examine TLS,
            and a grade reflects only the checks Fulcrum runs; it is not a statement that a site
            is or is not secure.
          </p>

          <p className="mt-4 text-sm text-ink-muted">
            A free account adds the full ranked remediation plan, copy-paste fixes, TLS scanning
            of domains you own, and history that shows whether your changes worked.{" "}
            <Link href="/register" className="text-signal-ink hover:underline">
              Create an account
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
