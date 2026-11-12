import { AuthShell } from "@/components/auth-shell";
import { VerifyClient } from "@/app/verify-email/verify-client";
import { Panel } from "@/components/ui";
import Link from "next/link";

export const metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";

  return (
    <AuthShell>
      {value ? (
        <VerifyClient token={value} />
      ) : (
        <Panel as="h1" title="This link is incomplete">
          <p className="text-sm leading-relaxed text-ink-muted">
            The confirmation link is missing its token, which usually means it was cut off
            when it was copied. Open the full link from the email, or{" "}
            <Link href="/login" className="text-signal-ink hover:underline">
              sign in
            </Link>{" "}
            to have a new one sent.
          </p>
        </Panel>
      )}
    </AuthShell>
  );
}
