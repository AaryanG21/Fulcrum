import {
  SEVERITY_ORDER,
  SEVERITY_WEIGHT,
  type Finding,
  type Grade,
  type Severity,
} from "@/lib/agent/types";

const RISK_SCALE = 10;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function computeRiskScore(input: {
  severity: Severity;
  exploitability: number;
  exposure: number;
}): number {
  const { severity, exploitability, exposure } = input;

  const weight = SEVERITY_WEIGHT[severity] ?? 0;
  const risk = weight * clamp01(exploitability) * clamp01(exposure) * RISK_SCALE;

  return Math.round(Math.min(100, Math.max(0, risk)));
}

export function computeOverallScore(findings: Finding[]): number {
  const scored = findings
    .filter((f) => f.severity !== "INFO")
    .map((f) => f.riskScore)
    .sort((a, b) => b - a);

  if (scored.length === 0) return 100;

  let penalty = 0;
  scored.forEach((risk, index) => {
    penalty += risk / (index + 1);
  });

  return Math.round(Math.min(100, Math.max(0, 100 - penalty)));
}

export function computeGrade(score: number): Grade {
  if (!Number.isFinite(score)) return "F";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function worstSeverity(findings: Finding[]): Severity | null {
  let worst: Severity | null = null;

  for (const finding of findings) {
    if (finding.severity === "INFO") continue;
    if (worst === null || SEVERITY_ORDER[finding.severity] > SEVERITY_ORDER[worst]) {
      worst = finding.severity;
    }
  }

  return worst;
}

const SEVERITY_FLOOR: Record<Severity, Grade> = {
  CRITICAL: "F",
  HIGH: "D",
  MEDIUM: "C",
  LOW: "B",
  INFO: "A",
};

const GRADE_RANK: Record<Grade, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };

export function computeGradeWithFloor(
  score: number,
  worst: Severity | null,
): Grade {
  const fromScore = computeGrade(score);
  if (worst === null) return "A";

  const floor = SEVERITY_FLOOR[worst];
  return GRADE_RANK[fromScore] >= GRADE_RANK[floor] ? fromScore : floor;
}

export function finalizeFinding(
  draft: Omit<Finding, "riskScore">,
): Finding {
  return {
    ...draft,
    riskScore: computeRiskScore({
      severity: draft.severity,
      exploitability: draft.exploitability,
      exposure: draft.exposure,
    }),
  };
}

export function severityBreakdown(
  findings: Finding[],
): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

export function mapExternalSeverity(
  label: unknown,
): { severity: Severity; recognized: boolean } {
  if (typeof label !== "string") return { severity: "MEDIUM", recognized: false };

  switch (label.trim().toUpperCase()) {
    case "CRITICAL":
      return { severity: "CRITICAL", recognized: true };
    case "HIGH":
      return { severity: "HIGH", recognized: true };
    case "MEDIUM":
    case "WARN":
      return { severity: "MEDIUM", recognized: true };
    case "LOW":
      return { severity: "LOW", recognized: true };
    case "INFO":
    case "OK":
    case "DEBUG":
      return { severity: "INFO", recognized: true };
    default:
      return { severity: "MEDIUM", recognized: false };
  }
}
