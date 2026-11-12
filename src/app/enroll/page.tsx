import { AuthShell } from "@/components/auth-shell";
import { EnrollFlow } from "@/app/enroll/enroll-flow";

export const metadata = { title: "Two-factor setup" };

export const dynamic = "force-dynamic";

export default function EnrollPage() {
  return (
    <AuthShell width="lg">
      <EnrollFlow />
    </AuthShell>
  );
}
