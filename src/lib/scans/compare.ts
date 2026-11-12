import type { Finding, Severity } from "@/lib/agent/types";
import { SEVERITY_ORDER } from "@/lib/agent/types";

export interface ChangedFinding {
  checkId: string;
  title: string;
  severity: Severity;
}

export interface SeverityShift {
  checkId: string;
  title: string;
  from: Severity;
  to: Severity;
}

export interface ScanComparison {
  added: ChangedFinding[];
  resolved: ChangedFinding[];
  shifted: SeverityShift[];
  unchanged: number;
}

function scoredByCheckId(findings: Finding[]): Map<string, Finding> {
  const byId = new Map<string, Finding>();
  for (const finding of findings) {
    if (finding.severity === "INFO") continue;
    const existing = byId.get(finding.checkId);
    if (!existing || SEVERITY_ORDER[finding.severity] > SEVERITY_ORDER[existing.severity]) {
      byId.set(finding.checkId, finding);
    }
  }
  return byId;
}

function bySeverityThenTitle(a: ChangedFinding, b: ChangedFinding): number {
  return (
    SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] || a.title.localeCompare(b.title)
  );
}

export function compareScans(previous: Finding[], current: Finding[]): ScanComparison {
  const before = scoredByCheckId(previous);
  const after = scoredByCheckId(current);

  const added: ChangedFinding[] = [];
  const resolved: ChangedFinding[] = [];
  const shifted: SeverityShift[] = [];
  let unchanged = 0;

  for (const [checkId, now] of after) {
    const was = before.get(checkId);
    if (!was) {
      added.push({ checkId, title: now.title, severity: now.severity });
    } else if (was.severity !== now.severity) {
      shifted.push({ checkId, title: now.title, from: was.severity, to: now.severity });
    } else {
      unchanged += 1;
    }
  }

  for (const [checkId, was] of before) {
    if (!after.has(checkId)) {
      resolved.push({ checkId, title: was.title, severity: was.severity });
    }
  }

  added.sort(bySeverityThenTitle);
  resolved.sort(bySeverityThenTitle);
  shifted.sort(
    (a, b) => SEVERITY_ORDER[b.to] - SEVERITY_ORDER[a.to] || a.title.localeCompare(b.title),
  );

  return { added, resolved, shifted, unchanged };
}

export function isImprovement(c: ScanComparison): boolean {
  return (
    c.resolved.length > 0 &&
    c.added.length === 0 &&
    c.shifted.every((s) => SEVERITY_ORDER[s.to] < SEVERITY_ORDER[s.from])
  );
}
