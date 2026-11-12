import { type NextRequest } from "next/server";
import { apiError, apiOk, getRequestMeta } from "@/lib/http";
import { enforceCsrf, enforceRateLimit } from "@/lib/auth/guards";
import { ipAccountKey } from "@/lib/security/rate-limit";
import { parseJsonBody, tryItSchema } from "@/lib/validation/schemas";
import { normalizeHostname } from "@/lib/validation/hostname";
import { runScan } from "@/lib/agent/run";
import { severityBreakdown } from "@/lib/agent/scoring";
import { SEVERITY_ORDER } from "@/lib/agent/types";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CACHE_WINDOW_MS = 15 * 60_000;
const CACHE_MAX_ENTRIES = 200;
const MAX_IN_FLIGHT = 4;

interface Summary {
  hostname: string;
  grade: string;
  score: number;
  findingCount: number;
  counts: { critical: number; high: number; medium: number; low: number };
  top: Array<{ title: string; severity: string; remediation: string }>;
  incomplete: boolean;
}

const cache = new Map<string, { at: number; summary: Summary }>();
let inFlight = 0;

function remember(hostname: string, summary: Summary): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(hostname, { at: Date.now(), summary });
}

export async function POST(request: NextRequest) {
  const meta = getRequestMeta(request);

  const blocked = await enforceCsrf(request);
  if (blocked) return blocked;

  const body = await parseJsonBody(request, tryItSchema);
  if (!body.ok) {
    return apiError(400, "invalid_input", "Enter a hostname like example.com.", body.fieldErrors);
  }

  const normalized = normalizeHostname(body.data.hostname);
  if (!normalized.ok) {
    return apiError(400, "invalid_hostname", normalized.reason);
  }
  const hostname = normalized.hostname;

  const limited =
    (await enforceRateLimit(request, "tryIt", ipAccountKey(meta.ipAddress, "try"))) ??
    (await enforceRateLimit(request, "tryItGlobal", "all"));
  if (limited) return limited;

  const cached = cache.get(hostname);
  if (cached && Date.now() - cached.at < CACHE_WINDOW_MS) {
    const response = apiOk({ ...cached.summary, cached: true });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const targetLimited = await enforceRateLimit(request, "tryItTarget", hostname);
  if (targetLimited) return targetLimited;

  if (inFlight >= MAX_IN_FLIGHT) {
    return apiError(429, "busy", "Several checks are running right now. Try again in a moment.");
  }

  inFlight += 1;
  try {
    await writeAudit({
      action: "PUBLIC_SCAN_REQUESTED",
      targetType: "Hostname",
      targetId: hostname,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
      metadata: { anonymous: true },
    });

    const result = await runScan({
      hostname,
      budgetLimit: 15,
      includeTls: false,
    });

    if (!result.ok) {
      await writeAudit({
        action: "PUBLIC_SCAN_FAILED",
        targetType: "Hostname",
        targetId: hostname,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        metadata: { anonymous: true, reason: result.reason },
      });
      return apiError(502, "check_failed", result.reason);
    }

    const { outcome } = result;
    const counts = severityBreakdown(outcome.findings);

    const summary: Summary = {
      hostname: outcome.hostname,
      grade: outcome.grade,
      score: outcome.score,
      findingCount: outcome.findings.filter((f) => f.severity !== "INFO").length,
      counts: {
        critical: counts.CRITICAL,
        high: counts.HIGH,
        medium: counts.MEDIUM,
        low: counts.LOW,
      },
      top: outcome.findings
        .filter((f) => f.severity !== "INFO")
        .sort(
          (a, b) =>
            SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] || b.riskScore - a.riskScore,
        )
        .slice(0, 5)
        .map((f) => ({ title: f.title, severity: f.severity, remediation: f.remediation })),
      incomplete: outcome.degraded.length > 0,
    };

    remember(hostname, summary);

    await writeAudit({
      action: "PUBLIC_SCAN_COMPLETED",
      targetType: "Hostname",
      targetId: hostname,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
      metadata: { anonymous: true, grade: outcome.grade, findingCount: summary.findingCount },
    });

    const response = apiOk({ ...summary, cached: false });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } finally {
    inFlight -= 1;
  }
}
