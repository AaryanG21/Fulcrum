import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/app/forgot-password/forgot-form";

export const metadata = {
  title: "Reset your password",
  description: "Ask for a link to choose a new Fulcrum password.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      below={
        <Link href="/login" className="text-signal-ink hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
