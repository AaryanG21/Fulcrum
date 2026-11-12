import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { Panel, Stat } from "@/components/ui";
import { DomainManager } from "@/app/dashboard/domain-manager";
import { PublicCheck } from "@/app/dashboard/public-check";
import { ScanLauncher } from "@/app/dashboard/scan-launcher";
import {
  DNS_CHALLENGE_PREFIX,
  HTTP_CHALLENGE_PATH,
} from "@/lib/domains/verification";
import { isVerificationStale } from "@/lib/domains/allowlist";
import { getEnv } from "@/lib/env";
import { loginRedirectUrl } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect(loginRedirectUrl("/dashboard"));

  const [domains, scans] = await Promise.all([
    prisma.domain.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        hostname: true,
        verificationStatus: true,
        verificationMethod: true,
        verificationToken: true,
        verifiedAt: true,
        createdAt: true,
        schedule: {
          select: {
            intervalDays: true,
            notifyOnRegression: true,
            enabled: true,
            nextRunAt: true,
            pausedReason: true,
          },
        },
      },
    }),
    prisma.scanResult.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 10,
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
  ]);

  const verifiedCount = domains.filter(
    (d) => d.verificationStatus === "VERIFIED",
  ).length;

  const ttlDays = getEnv().DOMAIN_VERIFICATION_TTL_DAYS;
  const isStale = (verifiedAt: Date | null) =>
    isVerificationStale(verifiedAt, ttlDays);

  const staleCount = domains.filter(
    (d) => d.verificationStatus === "VERIFIED" && isStale(d.verifiedAt),
  ).length;

  return (
    <AppShell email={session.email} isAdmin={session.role === "ADMIN"} active="dashboard" title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Domains"
          value={domains.length}
          hint={
            staleCount > 0
              ? `${verifiedCount} verified · ${staleCount} need re-verifying`
              : `${verifiedCount} verified`
          }
        />
        <Stat label="Scans run" value={scans.length} hint="last 10 shown" />
        <Stat
          label="Latest grade"
          value={scans.find((s) => s.grade)?.grade ?? "—"}
          hint={scans[0]?.hostname ?? "no scans yet"}
        />
      </div>

      <div className="mt-6">
        <DomainManager
          initialDomains={domains.map((d) => ({
            ...d,
            stale: d.verificationStatus === "VERIFIED" && isStale(d.verifiedAt),
            verifiedAt: d.verifiedAt?.toISOString() ?? null,
            createdAt: d.createdAt.toISOString(),
            schedule: d.schedule
              ? { ...d.schedule, nextRunAt: d.schedule.nextRunAt.toISOString() }
              : null,
            challenge:
              d.verificationMethod === "DNS_TXT"
                ? {
                    type: "DNS_TXT" as const,
                    target: `${DNS_CHALLENGE_PREFIX}.${d.hostname}`,
                    value: d.verificationToken,
                  }
                : {
                    type: "HTTP_WELL_KNOWN" as const,
                    target: `https://${d.hostname}${HTTP_CHALLENGE_PATH}`,
                    value: d.verificationToken,
                  },
          }))}
        />
      </div>

      <div className="mt-6">
        <ScanLauncher
          domains={domains
            .filter((d) => d.verificationStatus === "VERIFIED")
            .map((d) => ({
              id: d.id,
              hostname: d.hostname,
              stale: isStale(d.verifiedAt),
            }))}
        />
      </div>

      <div className="mt-6">
        <PublicCheck />
      </div>

      <div className="mt-6">
        <Panel
          title="Scan history"
          description="Your latest ten. Full scans of domains you verified, and headers-only checks."
        >
          {scans.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No scans yet. Verify a domain first — the agent refuses to scan
              anything unverified, and logs the refusal.
            </p>
          ) : (
            <table className="data-table w-full text-sm">
              <caption className="sr-only">Your recent scans, newest first</caption>
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
                      <Link
                        href={`/scans/${scan.id}`}
                        className="text-signal-ink hover:underline"
                      >
                        {scan.hostname}
                      </Link>
                      {scan.scanType === "HEADERS_ONLY" && (
                        <span
                          className="ml-2 rounded border border-line-bright px-1.5 py-0.5 text-[10px] tracking-wide text-ink-faint uppercase"
                        >
                          headers
                          <span className="sr-only"> only — TLS was not examined</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-ink-muted">{scan.status}</td>
                    <td className="py-2 font-mono text-ink">{scan.grade ?? "—"}</td>
                    <td className="py-2 font-mono text-ink-muted">{scan.score ?? "—"}</td>
                    <td className="py-2 text-ink-faint">
                      {scan.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {scans.length > 0 && (
            <p className="mt-4 text-sm">
              <Link href="/scans" className="text-signal-ink hover:underline">
                View all scans and how each host has changed →
              </Link>
            </p>
          )}
        </Panel>
      </div>

    </AppShell>
  );
}
