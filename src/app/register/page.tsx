import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/app/register/register-form";
import { AuthenticatorNotice } from "@/components/authenticator-notice";

export const metadata = {
  title: "Create account",
  description:
    "Create a free Fulcrum account to scan domains you control and get a graded, ranked remediation plan.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/register" },
};

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <AuthShell
      below={
        <>
          Already registered?{" "}
          <Link href="/login" className="text-signal-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <AuthenticatorNotice />
      <RegisterForm />
    </AuthShell>
  );
}
