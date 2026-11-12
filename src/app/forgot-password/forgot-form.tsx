"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { Alert, Busy, Field, Panel, buttonClass, inputClass } from "@/components/ui";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await apiFetch("/api/auth/password/forgot", {
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

  if (sent) {
    return (
      <Panel as="h1" title="Check your email">
        <p className="text-sm leading-relaxed text-ink-muted">
          If <span className="font-mono text-ink">{email}</span> belongs to an account, we
          have sent it a link to choose a new password. It can take a minute, and it
          works for an hour.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          To finish you will need a code from your authenticator app, or one of your
          backup codes.
        </p>
        <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
          Nothing arrived? Check spam, then try again. If you have lost your
          authenticator app and every backup code, a reset by email cannot get you in —
          the second factor is what stops someone with access to your inbox from taking
          over the account.
        </p>
      </Panel>
    );
  }

  return (
    <Panel as="h1" title="Reset your password">
      <form method="post" onSubmit={submit} aria-busy={busy} className="space-y-4">
        <p className="text-sm text-ink-muted">
          Enter the email address on your account and we will send you a link.
        </p>

        {error && <Alert>{error}</Alert>}

        <Field label="Email">
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </Field>

        <button type="submit" className={`${buttonClass} w-full`} disabled={busy}>
          {busy ? <Busy>Sending…</Busy> : "Send reset link"}
        </button>
      </form>
    </Panel>
  );
}
