type Severity = "critical" | "high" | "medium" | "low" | "info";

const SEVERITY_ORDER: readonly Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const;

const SEVERITY_FILL: Record<Severity, string> = {
  critical: "fill-sev-critical",
  high: "fill-sev-high",
  medium: "fill-sev-medium",
  low: "fill-sev-low",
  info: "fill-sev-info",
};

const GRADE_TEXT: Record<string, string> = {
  A: "text-signal-ink",
  B: "text-signal-ink",
  C: "text-sev-medium",
  D: "text-sev-high",
  F: "text-sev-critical",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ScoreGauge({
  score,
  grade,
  className = "h-24 w-24",
}: {
  score: number;
  grade: string;
  className?: string;
}) {
  const safeScore = clamp(Math.round(score), 0, 100);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const filled = (safeScore / 100) * circumference;
  const tone = GRADE_TEXT[grade] ?? "text-ink-muted";

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} ${tone}`}
      role="img"
      aria-label={`Grade ${grade}, score ${safeScore} out of 100`}
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        className="stroke-line-bright"
        strokeWidth={6}
      />
      {safeScore > 0 && (
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 50 50)"
        />
      )}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        className="font-mono text-[2.5rem] font-bold"
      >
        {grade}
      </text>
    </svg>
  );
}

export function SeverityBar({
  counts,
  className = "h-2 w-full",
}: {
  counts: Partial<Record<Severity, number>>;
  className?: string;
}) {
  const present = SEVERITY_ORDER.map((severity) => ({
    severity,
    count: Math.max(0, counts[severity] ?? 0),
  })).filter((entry) => entry.count > 0);

  const total = present.reduce((sum, entry) => sum + entry.count, 0);

  if (total === 0) return null;

  const segments = present.reduce<
    { severity: Severity; x: number; width: number }[]
  >((acc, entry) => {
    const previous = acc[acc.length - 1];
    const x = previous ? previous.x + previous.width : 0;
    acc.push({ severity: entry.severity, x, width: entry.count });
    return acc;
  }, []);

  return (
    <svg
      viewBox={`0 0 ${total} 1`}
      preserveAspectRatio="none"
      className={`${className} overflow-hidden rounded-full`}
      role="img"
      aria-label={present.map((e) => `${e.count} ${e.severity}`).join(", ")}
    >
      {segments.map((segment) => (
        <rect
          key={segment.severity}
          x={segment.x}
          y={0}
          width={segment.width}
          height={1}
          className={SEVERITY_FILL[segment.severity]}
        />
      ))}
    </svg>
  );
}

export function BudgetMeter({
  used,
  limit,
  className = "h-1.5 w-full",
}: {
  used: number;
  limit: number;
  className?: string;
}) {
  if (!Number.isFinite(limit) || limit <= 0) return null;

  const safeUsed = clamp(used, 0, limit);
  const over = used > limit;

  return (
    <svg
      viewBox={`0 0 ${limit} 1`}
      preserveAspectRatio="none"
      className={`${className} overflow-hidden rounded-full`}
      role="img"
      aria-label={`${used} of ${limit} effort points used`}
    >
      <rect x={0} y={0} width={limit} height={1} className="fill-line-bright" />
      <rect
        x={0}
        y={0}
        width={safeUsed}
        height={1}
        className={over ? "fill-sev-high" : "fill-signal"}
      />
    </svg>
  );
}

export function RiskBar({
  risk,
  className = "h-1 w-10",
}: {
  risk: number;
  className?: string;
}) {
  const safeRisk = clamp(risk, 0, 100);
  const tone =
    safeRisk >= 70 ? "fill-sev-critical" : safeRisk >= 40 ? "fill-sev-high" : "fill-sev-low";

  return (
    <svg
      viewBox="0 0 100 1"
      preserveAspectRatio="none"
      className={`${className} overflow-hidden rounded-full`}
      aria-hidden="true"
    >
      <rect x={0} y={0} width={100} height={1} className="fill-line-bright" />
      <rect x={0} y={0} width={safeRisk} height={1} className={tone} />
    </svg>
  );
}

export function TrendLine({
  points,
  className = "h-20 w-full",
}: {
  points: Array<{ score: number }>;
  className?: string;
}) {
  if (points.length < 2) return null;

  const W = 300;
  const H = 80;
  const top = 6;
  const bottom = H - 6;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = bottom - (clamp(p.score, 0, 100) / 100) * (bottom - top);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const first = Math.round(points[0].score);
  const last = Math.round(points[points.length - 1].score);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`${className} overflow-visible`}
      role="img"
      aria-label={`Score across ${points.length} scans, from ${first} to ${last} out of 100`}
    >
      <line x1="0" y1={top} x2={W} y2={top} className="stroke-line" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <line x1="0" y1={bottom} x2={W} y2={bottom} className="stroke-line" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <polyline
        points={coords.join(" ")}
        fill="none"
        className="stroke-signal"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
