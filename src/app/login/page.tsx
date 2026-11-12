import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginFlow } from "@/app/login/login-flow";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata = {
  title: "Sign in",
  description: "Sign in to Fulcrum with your password and your authenticator app.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/login" },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const safeNext = safeNextPath(typeof next === "string" ? next : null);

  return (
    <AuthShell
      below={
        <>
          No account?{" "}
          <Link href="/register" className="text-signal-ink hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <LoginFlow next={safeNext} />
    </AuthShell>
  );
}
