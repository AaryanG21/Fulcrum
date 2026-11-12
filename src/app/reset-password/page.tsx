import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/app/reset-password/reset-form";
import { Panel } from "@/components/ui";

export const metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";

  return (
    <AuthShell
      below={
        <Link href="/login" className="text-signal-ink hover:underline">
          Back to sign in
        </Link>
      }
    >
      {value ? (
        <ResetForm token={value} />
      ) : (
        <Panel as="h1" title="This link is incomplete">
          <p className="text-sm leading-relaxed text-ink-muted">
            The reset link is missing its token, which usually means it was cut off when it
            was copied. Open the full link from the email, or{" "}
            <Link href="/forgot-password" className="text-signal-ink hover:underline">
              ask for a new one
            </Link>
            .
          </p>
        </Panel>
      )}
    </AuthShell>
  );
}
