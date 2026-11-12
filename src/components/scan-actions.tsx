"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { CopyButton } from "@/components/copy-button";
import { Alert, Busy, buttonClass, buttonGhostClass } from "@/components/ui";

export function ScanActions({
  scanId,
  activeLinks,
}: {
  scanId: string;
  activeLinks: number;
}) {
  const [links, setLinks] = useState(activeLinks);
  const [url, setUrl] = useState<{ value: string; expires: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"share" | "revoke" | null>(null);

  async function share() {
    setBusy("share");
    setError(null);
    const result = await apiFetch<{ url: string; expiresAt: string }>(
      `/api/scans/${scanId}/share`,
      { method: "POST" },
    );
    setBusy(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setUrl({ value: result.data.url, expires: result.data.expiresAt.slice(0, 10) });
    setLinks((n) => n + 1);
  }

  async function revoke() {
    setBusy("revoke");
    setError(null);
    const result = await apiFetch(`/api/scans/${scanId}/share`, { method: "DELETE" });
    setBusy(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setUrl(null);
    setLinks(0);
  }

  return (
    <div className="glass mb-6 rounded-2xl p-4 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={buttonClass} onClick={share} disabled={busy !== null}>
          {busy === "share" ? <Busy>Creating link…</Busy> : "Create share link"}
        </button>

        <a
          className={buttonGhostClass}
          href={`/api/scans/${scanId}/export`}
          download
        >
          Download JSON
        </a>

        <button type="button" className={buttonGhostClass} onClick={() => window.print()}>
          Print or save as PDF
        </button>

        {links > 0 && (
          <button
            type="button"
            className="text-sm text-ink-muted underline hover:text-ink"
            onClick={revoke}
            disabled={busy !== null}
          >
            {busy === "revoke" ? "Revoking…" : `Revoke ${links} active link${links === 1 ? "" : "s"}`}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}

      {url && (
        <div className="mt-4 space-y-2">
          <label htmlFor="share-url" className="block text-sm font-medium text-ink">
            Share link
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="share-url"
              readOnly
              value={url.value}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-xl border border-line-bright/70 bg-base/50 px-3 py-2 font-mono text-xs text-ink"
            />
            <CopyButton text={url.value} label="Copy link" />
          </div>
          <p className="text-xs leading-relaxed text-ink-muted">
            Anyone with this link can read this scorecard until {url.expires}, without signing
            in. Copy it now: it is shown once and cannot be recovered, only replaced. Revoke it
            whenever you like.
          </p>
        </div>
      )}
    </div>
  );
}
