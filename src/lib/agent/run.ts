import "server-only";
import { errorMessage, log } from "@/lib/log";
import { normalizeHostname } from "@/lib/validation/hostname";
import { probeHeaders, evaluateHeaders } from "@/lib/agent/headers";
import { fingerprint, fingerprintFindings } from "@/lib/agent/fingerprint";
import { cveFindings, matchCves } from "@/lib/agent/cve";
import { mapTestsslRecords, runTestssl } from "@/lib/agent/testssl";
import { buildRemediationPlan } from "@/lib/agent/plan";
import {
  computeGradeWithFloor,
  computeOverallScore,
  worstSeverity,
} from "@/lib/agent/scoring";
import { MAX_TOTAL_EVIDENCE_LENGTH } from "@/lib/agent/sanitize";
import type { Finding, ScanOutcome } from "@/lib/agent/types";

export interface ScanRequest {
  hostname: string;
  budgetLimit: number;
  includeTls?: boolean;
}

export type ScanRun =
  | { ok: true; outcome: ScanOutcome }
  | { ok: false; reason: string };

interface StepResult {
  findings: Finding[];
  degraded?: { step: string; reason: string };
}

export async function runScan(request: ScanRequest): Promise<ScanRun> {
  const startedAt = new Date();

  const normalized = normalizeHostname(request.hostname);
  if (!normalized.ok) {
    return { ok: false, reason: normalized.reason };
  }
  const hostname = normalized.hostname;

  const findings: Finding[] = [];
  const degraded: ScanOutcome["degraded"] = [];
  let testsslVersion: string | null = null;

  const headerStep = await stepHeaders(hostname);
  findings.push(...headerStep.findings);
  if (headerStep.degraded) degraded.push(headerStep.degraded);

  const probe = headerStep.probe;
  const fingerprints = probe?.ok ? fingerprint(probe) : [];
  findings.push(...fingerprintFindings(fingerprints));

  if (!probe?.ok) {
    degraded.push({
      step: "fingerprint",
      reason: "Skipped: no HTTP response to fingerprint",
    });
  } else if (fingerprints.length === 0) {
    degraded.push({
      step: "fingerprint",
      reason: "No recognizable software version disclosed — CVE matching was skipped",
    });
  }

  if (fingerprints.length > 0) {
    const matches = matchCves(fingerprints);
    findings.push(...cveFindings(matches));
  }

  let tlsObserved = false;
  if (request.includeTls !== false) {
    const tlsStep = await stepTls(hostname);
    findings.push(...tlsStep.findings);
    if (tlsStep.degraded) degraded.push(tlsStep.degraded);
    testsslVersion = tlsStep.version;
    tlsObserved = tlsStep.observed;
  } else {
    degraded.push({
      step: "tls",
      reason:
        "TLS and certificate configuration were not examined. This check " +
        "read HTTP response headers only, so the transport posture of this " +
        "host is unknown — not verified clean. A full scan, which requires " +
        "proving you control the domain, is what tests it.",
    });
  }

  const headersObserved = headerStep.probe?.ok === true;
  if (!headersObserved && !tlsObserved) {
    const why = headerStep.degraded?.reason ?? "no probe reached the target";
    return {
      ok: false,
      reason: `Nothing could be measured about ${hostname}: ${why}`,
    };
  }

  const bounded = capTotalEvidence(dedupeFindings(findings));

  const score = computeOverallScore(bounded);
  const grade = computeGradeWithFloor(score, worstSeverity(bounded));
  const plan = buildRemediationPlan(bounded, { budgetLimit: request.budgetLimit });

  return {
    ok: true,
    outcome: {
      hostname,
      findings: bounded.sort((a, b) => b.riskScore - a.riskScore),
      score,
      grade,
      plan,
      testsslVersion,
      degraded,
      startedAt,
      completedAt: new Date(),
    },
  };
}

async function stepHeaders(
  hostname: string,
): Promise<StepResult & { probe: Awaited<ReturnType<typeof probeHeaders>> | null }> {
  try {
    const probe = await probeHeaders(hostname);

    if (!probe.ok) {
      return {
        findings: [],
        probe,
        degraded: {
          step: "headers",
          reason: probe.reason ?? "The target could not be reached over HTTPS",
        },
      };
    }

    return { findings: evaluateHeaders(probe), probe };
  } catch (error) {
    log.error("unexpected failure in the scan header step", {
      error: errorMessage(error),
    });

    return {
      findings: [],
      probe: null,
      degraded: {
        step: "headers",
        reason:
          "The header check could not be completed. The HTTP posture of this host is unknown, not verified clean.",
      },
    };
  }
}

async function stepTls(
  hostname: string,
): Promise<StepResult & { version: string | null; observed: boolean }> {
  const result = await runTestssl(hostname);

  if (!result.ok) {
    return {
      findings: [],
      version: null,
      observed: false,
      degraded: {
        step: "tls",
        reason:
          result.kind === "timeout"
            ? `TLS scan timed out — the TLS posture of this host is unknown, not verified clean. ${result.reason}`
            : `TLS scan did not complete: ${result.reason}`,
      },
    };
  }

  const mapped = mapTestsslRecords(result.records);

  if (mapped.fatal) {
    return {
      findings: [],
      version: result.version,
      observed: false,
      degraded: {
        step: "tls",
        reason: `TLS scan did not run — the TLS posture of this host is unknown, not verified clean. testssl.sh reported: ${mapped.fatal}`,
      },
    };
  }

  const notes: string[] = [];
  if (mapped.unrecognizedSeverities.length > 0) {
    notes.push(
      `testssl.sh reported severity labels this build does not recognize (${mapped.unrecognizedSeverities.join(", ")}); they were treated as medium.`,
    );
  }

  return {
    findings: mapped.findings,
    version: result.version,
    observed: true,
    ...(notes.length > 0 ? { degraded: { step: "tls", reason: notes.join(" ") } } : {}),
  };
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const byCheck = new Map<string, Finding>();

  for (const finding of findings) {
    const existing = byCheck.get(finding.checkId);
    if (!existing || finding.riskScore > existing.riskScore) {
      byCheck.set(finding.checkId, finding);
    }
  }

  return [...byCheck.values()];
}

function capTotalEvidence(findings: Finding[]): Finding[] {
  let budget = MAX_TOTAL_EVIDENCE_LENGTH;

  return findings.map((finding) => {
    if (!finding.evidence) return finding;

    if (budget <= 0) {
      return { ...finding, evidence: "[evidence omitted: total size limit reached]" };
    }

    if (finding.evidence.length > budget) {
      const trimmed = `${finding.evidence.slice(0, budget)}…[truncated]`;
      budget = 0;
      return { ...finding, evidence: trimmed };
    }

    budget -= finding.evidence.length;
    return finding;
  });
}
