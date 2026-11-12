import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Panel } from "@/components/ui";

export const metadata = {
  title: "Scan not found",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ScanNotFound() {
  return (
    <AuthShell
      below={
        <Link href="/dashboard" className="text-signal-ink hover:underline">
          Back to the dashboard
        </Link>
      }
    >
      <Panel as="h1" title="No such scan">
        <p className="text-sm leading-relaxed text-ink-muted">
          That scan does not exist, or it is not one of yours. Your own scans are listed in{" "}
          <Link href="/scans" className="text-signal-ink hover:underline">
            your history
          </Link>
          .
        </p>
      </Panel>
    </AuthShell>
  );
}
