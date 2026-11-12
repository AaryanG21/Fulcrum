"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { Busy } from "@/components/ui";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await apiFetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-line-bright px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-sev-critical/50 hover:text-ink disabled:opacity-50"
    >
      {busy ? <Busy>Signing out…</Busy> : "Sign out"}
    </button>
  );
}
