import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Panel } from "@/components/ui";

export const metadata = {
  title: "Report not available",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function SharedReportNotFound() {
  return (
    <AuthShell
      below={
        <Link href="/" className="text-signal-ink hover:underline">
          Go to Fulcrum
        </Link>
      }
    >
      <Panel as="h1" title="This report is not available">
        <p className="text-sm leading-relaxed text-ink-muted">
          The link may have expired, may have been switched off by whoever shared it, or may
          have been copied incorrectly. Ask them for a new one.
        </p>
      </Panel>
    </AuthShell>
  );
}
