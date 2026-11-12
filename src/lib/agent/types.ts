export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  INFO: 0,
};

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICAL: 10,
  HIGH: 7,
  MEDIUM: 4,
  LOW: 2,
  INFO: 0,
};

export type FindingSource = "headers" | "tls" | "fingerprint" | "cve";

export type EffortPoints = number;

export interface Finding {
  checkId: string;

  source: FindingSource;

  title: string;
  description: string;
  remediation: string;

  severity: Severity;

  exploitability: number;

  exposure: number;

  riskScore: number;

  effort: EffortPoints;

  evidence?: string;

  cves?: string[];

  epss?: number;

  injectionAttempt?: boolean;
}

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface RemediationStep {
  checkId: string;
  title: string;
  action: string;
  severity: Severity;
  effort: EffortPoints;
  riskReduction: number;
  efficiency: number;
  reasoning: string;
  rank: number;
}

export interface RemediationPlan {
  budgetLimit: EffortPoints;
  budgetUsed: EffortPoints;
  steps: RemediationStep[];
  deferred: Array<{
    checkId: string;
    title: string;
    effort: EffortPoints;
    riskReduction: number;
    reason: string;
  }>;
  projectedScore: number;
  projectedGrade: Grade;
  strategy: string;
}

export interface ScanOutcome {
  hostname: string;
  findings: Finding[];
  score: number;
  grade: Grade;
  plan: RemediationPlan;
  testsslVersion: string | null;
  degraded: Array<{ step: string; reason: string }>;
  startedAt: Date;
  completedAt: Date;
}
