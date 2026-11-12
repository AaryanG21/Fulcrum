import "server-only";
import {
  CVE_DATASET,
  versionAffected,
  type CveRecord,
} from "@/lib/agent/cve-dataset";
import { finalizeFinding } from "@/lib/agent/scoring";
import type { Finding, Severity } from "@/lib/agent/types";
import type { Fingerprint } from "@/lib/agent/fingerprint";

const VERSION_ASSERTED_EXPOSURE = 0.7;

function severityFromCvss(cvss: number): Severity {
  if (cvss >= 9.0) return "CRITICAL";
  if (cvss >= 7.0) return "HIGH";
  if (cvss >= 4.0) return "MEDIUM";
  if (cvss > 0) return "LOW";
  return "INFO";
}

export function exploitabilityFromEpss(epss: number): number {
  if (!Number.isFinite(epss) || epss <= 0) return 0.1;
  return Math.min(1, Math.max(0.1, Math.sqrt(epss)));
}

export interface CveMatch {
  record: CveRecord;
  product: string;
  version: string;
}

export function matchCves(fingerprints: Fingerprint[]): CveMatch[] {
  const matches: CveMatch[] = [];

  for (const fp of fingerprints) {
    if (!fp.version) continue;

    for (const record of CVE_DATASET) {
      if (record.product !== fp.product) continue;
      if (!versionAffected(fp.version, record)) continue;
      matches.push({ record, product: fp.product, version: fp.version });
    }
  }

  return matches;
}

export function cveFindings(matches: CveMatch[]): Finding[] {
  return matches.map(({ record, product, version }) =>
    finalizeFinding({
      checkId: `cve:${record.id}`,
      source: "cve",
      title: `${record.id}: ${record.title}`,
      description:
        `${product} ${version} falls within the affected range for ${record.id} ` +
        `(CVSS ${record.cvss.toFixed(1)}, EPSS ${(record.epss * 100).toFixed(1)}% chance of ` +
        `exploitation in the next 30 days). The version is self-reported by the target, ` +
        `so this is a strong indication rather than a confirmed exploit.`,
      remediation: record.remediation,
      severity: severityFromCvss(record.cvss),
      exploitability: exploitabilityFromEpss(record.epss),
      exposure: VERSION_ASSERTED_EXPOSURE,
      effort: record.effort,
      evidence: `${product}/${version} matched ${record.id} (affected: ${record.introduced ?? "any"} to ${record.fixed ?? "unfixed"})`,
      cves: [record.id],
      epss: record.epss,
    }),
  );
}

export async function refreshEpss(
  cveIds: string[],
  opts: { timeoutMs?: number } = {},
): Promise<{ scores: Map<string, number>; stale: boolean; reason?: string }> {
  const scores = new Map<string, number>();
  if (cveIds.length === 0) return { scores, stale: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 5_000);

  try {
    const url = new URL("https://api.first.org/data/v1/epss");
    url.searchParams.set("cve", cveIds.slice(0, 50).join(","));

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return { scores, stale: true, reason: `EPSS API returned ${response.status}` };
    }

    const body = (await response.json()) as {
      data?: Array<{ cve?: string; epss?: string }>;
    };

    for (const row of body.data ?? []) {
      if (!row.cve || !row.epss) continue;
      const value = Number.parseFloat(row.epss);
      if (Number.isFinite(value) && value >= 0 && value <= 1) {
        scores.set(row.cve.toUpperCase(), value);
      }
    }

    return { scores, stale: false };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      scores,
      stale: true,
      reason: aborted ? "EPSS lookup timed out" : "EPSS lookup failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export { CVE_COVERAGE_NOTE } from "@/lib/agent/cve-dataset";
