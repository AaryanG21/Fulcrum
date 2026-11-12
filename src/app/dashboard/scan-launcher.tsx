"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { Alert, Busy, Field, Panel, buttonClass, inputClass } from "@/components/ui";

interface ScannableDomain {
  id: string;
  hostname: string;
  stale: boolean;
}

export function ScanLauncher({ domains }: { domains: ScannableDomain[] }) {
  const router = useRouter();
  const [budget, setBudget] = useState(15);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [chosenId, setChosenId] = useState<string | null>(null);
  const domainId =
    chosenId && domains.some((d) => d.id === chosenId)
      ? chosenId
      : (domains[0]?.id ?? "");

  async function launch(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await apiFetch<{ scanId: string }>("/api/scans", {
      method: "POST",
      body: { domainId, budget },
    });

    setBusy(false);

    if (!result.ok) {
      const fieldError = result.error.details
        ? Object.entries(result.error.details)
            .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
            .join(" · ")
        : null;
      setError(fieldError ? `${result.error.message} (${fieldError})` : result.error.message);
      return;
    }

    router.push(`/scans/${result.data.scanId}`);
  }

  if (domains.length === 0) {
    return (
      <Panel title="Run a scan">
        <p className="text-sm text-ink-muted">
          No verified domains yet. Register a domain and complete the ownership
          challenge above — the agent refuses to scan anything unverified, and
          logs the refusal.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Run a scan"
      description="Checks HTTP headers, TLS configuration via testssl.sh, and known CVEs for any disclosed versions."
    >
      <form method="post" onSubmit={launch} aria-busy={busy} className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Field label="Verified domain">
            <select
              className={inputClass}
              value={domainId}
              onChange={(e) => setChosenId(e.target.value)}
              required
            >
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.hostname}
                  {domain.stale ? " — needs re-verification" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="w-40">
          <Field
            label="Fix-effort budget"
            hint="Arbitrary points. Roughly: 1 = a header, 13 = a project."
          >
            <input
              className={inputClass}
              type="number"
              min={1}
              max={1000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              required
            />
          </Field>
        </div>

        <button type="submit" className={buttonClass} disabled={busy}>
          {busy ? <Busy>Queueing…</Busy> : "Run scan"}
        </button>
      </form>

      {!busy && domains.find((d) => d.id === domainId)?.stale && (
        <p className="mt-3 text-xs text-sev-medium">
          Ownership of this domain was proven too long ago to still count.
          Re-run its challenge above; the scan will be refused until you do.
        </p>
      )}

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
    </Panel>
  );
}
