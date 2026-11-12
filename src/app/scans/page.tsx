import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { loginRedirectUrl } from "@/lib/safe-redirect";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui";
import { TrendLine } from "@/components/viz";
import { buttonGhostClass, inputClass } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scan history" };

const PAGE_SIZE = 20;

export default async function ScanHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; host?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect(loginRedirectUrl("/scans"));

  const sp = await searchParams;
  const requestedPage = Number.parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10_000) : 1;
  const host = typeof sp.host === "string" && sp.host.length > 0 && sp.host.length <= 253 ? sp.host : null;

  const where = { userId: session.id, ...(host ? { hostname: host } : {}) };

  const [total, scans, hostRows, trendRows] = await Promise.all([
    prisma.scanResult.count({ where }),
    prisma.scanResult.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        hostname: true,
        scanType: true,
        status: true,
        grade: true,
        score: true,
        createdAt: true,
      },
    }),
    prisma.scanResult.findMany({
      where: { userId: session.id },
      distinct: ["hostname"],
      orderBy: { hostname: "asc" },
      select: { hostname: true },
    }),
    host
      ? prisma.scanResult.findMany({
          where: { userId: session.id, hostname: host, status: "COMPLETED", score: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { score: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const trend = trendRows
    .slice()
    .reverse()
    .map((r) => ({ score: r.score ?? 0 }));

  const link = (p: number) =>
    `/scans?${new URLSearchParams({ ...(host ? { host } : {}), page: String(p) }).toString()}`;

  return (
    <AppShell email={session.email} isAdmin={session.role === "ADMIN"} active="dashboard" title="Scan history">
      <div className="space-y-6">
        <Panel
          title="Filter"
          description="Narrow the history to one host to see how its score has moved."
        >
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <label htmlFor="host" className="block text-sm font-medium text-ink">
                Host
              </label>
              <select id="host" name="host" defaultValue={host ?? ""} className={`${inputClass} mt-1.5`}>
                <option value="">All hosts</option>
                {hostRows.map((r) => (
                  <option key={r.hostname} value={r.hostname}>
                    {r.hostname}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={buttonGhostClass}>
              Apply
            </button>
          </form>
        </Panel>

        {host && trend.length >= 2 && (
          <Panel
            title={`Score over time — ${host}`}
            description={`The last ${trend.length} completed scans, oldest on the left. The scale is always 0 to 100.`}
          >
            <TrendLine points={trend} />
            <p className="mt-2 font-mono text-xs text-ink-muted">
              {trend[0].score} → {trend[trend.length - 1].score}
            </p>
          </Panel>
        )}

        <Panel title={host ? `Scans of ${host}` : "All scans"} description={`${total} in total.`}>
          {scans.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {total === 0 ? "No scans yet." : "That page is past the end of your history."}{" "}
              <Link href="/dashboard" className="text-signal-ink hover:underline">
                Back to the dashboard
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-sm">
                <caption className="sr-only">Your scans, newest first</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wide text-ink-faint uppercase">
                    <th scope="col" className="pb-2 font-medium">Host</th>
                    <th scope="col" className="pb-2 font-medium">Status</th>
                    <th scope="col" className="pb-2 font-medium">Grade</th>
                    <th scope="col" className="pb-2 font-medium">Score</th>
                    <th scope="col" className="pb-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => (
                    <tr key={scan.id} className="border-b border-line/50 last:border-0">
                      <td className="py-2 font-mono">
                        <Link href={`/scans/${scan.id}`} className="text-signal-ink hover:underline">
                          {scan.hostname}
                        </Link>
                        {scan.scanType === "HEADERS_ONLY" && (
                          <span className="ml-2 rounded border border-line-bright px-1.5 py-0.5 text-[10px] tracking-wide text-ink-faint uppercase">
                            headers
                            <span className="sr-only"> only — TLS was not examined</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-ink-muted">{scan.status}</td>
                      <td className="py-2 font-mono text-ink">{scan.grade ?? "—"}</td>
                      <td className="py-2 font-mono text-ink-muted">{scan.score ?? "—"}</td>
                      <td className="py-2 text-ink-muted">
                        {scan.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
              {page > 1 ? (
                <Link href={link(page - 1)} className="text-signal-ink hover:underline">
                  ← Newer
                </Link>
              ) : (
                <span aria-hidden />
              )}
              <span className="text-ink-muted">
                Page {Math.min(page, pages)} of {pages}
              </span>
              {page < pages ? (
                <Link href={link(page + 1)} className="text-signal-ink hover:underline">
                  Older →
                </Link>
              ) : (
                <span aria-hidden />
              )}
            </nav>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
