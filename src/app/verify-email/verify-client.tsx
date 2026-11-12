"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { Alert, Busy, Field, Panel, buttonClass, inputClass } from "@/components/ui";

type State =
  | { kind: "working" }
  | { kind: "done" }
  | { kind: "failed"; message: string };

export function VerifyClient({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "working" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    apiFetch("/api/auth/email/verify", { method: "POST", body: { token } }).then(
      (result) => {
        setState(
          result.ok ? { kind: "done" } : { kind: "failed", message: result.error.message },
        );
      },
    );
  }, [token]);

  if (state.kind === "working") {
    return (
      <Panel as="h1" title="Confirming your email">
        <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
          <Busy>Checking your link…</Busy>
        </p>
      </Panel>
    );
  }

  if (state.kind === "done") {
    return (
      <Panel as="h1" title="Email confirmed">
        <p className="text-sm leading-relaxed text-ink-muted">
          Thanks — that address is confirmed. Sign in with your password and your
          authenticator app to continue.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex btn-glow rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
        >
          Go to sign in
        </Link>
      </Panel>
    );
  }

  return (
    <Panel as="h1" title="We could not confirm that link">
      <ResendForm reason={state.message} />
    </Panel>
  );
}

function ResendForm({ reason }: { reason: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await apiFetch("/api/auth/email/resend", {
      method: "POST",
      body: { email },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSent(true);
  }

  return (
    <form method="post" onSubmit={submit} aria-busy={busy} className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-muted">{reason}</p>
      <p className="text-sm leading-relaxed text-ink-muted">
        If you already confirmed this address, you can just{" "}
        <Link href="/login" className="text-signal-ink hover:underline">
          sign in
        </Link>
        . Otherwise we can send a fresh link.
      </p>

      {error && <Alert>{error}</Alert>}
      {sent && (
        <Alert tone="signal">
          If that address has an unconfirmed account, a new link is on its way.
        </Alert>
      )}

      <Field label="Email">
        <input
          className={inputClass}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </Field>

      <button type="submit" className={`${buttonClass} w-full`} disabled={busy}>
        {busy ? <Busy>Sending…</Busy> : "Send a new link"}
      </button>
    </form>
  );
}
