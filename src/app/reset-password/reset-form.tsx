"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { Alert, Busy, Field, Panel, buttonClass, inputClass } from "@/components/ui";

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirm) {
      setFieldErrors({ confirm: ["Passwords do not match"] });
      return;
    }

    setBusy(true);
    const result = await apiFetch("/api/auth/password/reset", {
      method: "POST",
      body: {
        token,
        password,
        ...(code ? (useBackupCode ? { backupCode: code } : { code }) : {}),
      },
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error.message);
      if (result.error.details) setFieldErrors(result.error.details);
      return;
    }

    setPassword("");
    setConfirm("");
    setCode("");
    setDone(true);
  }

  if (done) {
    return (
      <Panel as="h1" title="Password changed">
        <p className="text-sm leading-relaxed text-ink-muted">
          Your password has been changed and every device that was signed in has been
          signed out. Sign in with the new one.
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
    <Panel as="h1" title="Choose a new password">
      <form method="post" onSubmit={submit} aria-busy={busy} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <Field
          label="New password"
          hint="At least 12 characters. Length matters more than symbols."
          error={fieldErrors.password?.[0]}
        >
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={12}
            required
            autoFocus
          />
        </Field>

        <Field label="Confirm new password" error={fieldErrors.confirm?.[0]}>
          <input
            className={inputClass}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        {useBackupCode ? (
          <Field
            label="Backup code"
            hint="One of the single-use codes you saved at enrolment. It is used up by this."
            error={fieldErrors.code?.[0]}
          >
            <input
              className={`${inputClass} font-mono tracking-widest`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              placeholder="XXXX-XXXX"
            />
          </Field>
        ) : (
          <Field
            label="6-digit code"
            hint="From your authenticator app. Required for accounts with two-factor authentication."
            error={fieldErrors.code?.[0]}
          >
            <input
              className={`${inputClass} font-mono text-lg tracking-[0.4em]`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
            />
          </Field>
        )}

        <button type="submit" className={`${buttonClass} w-full`} disabled={busy}>
          {busy ? <Busy>Changing…</Busy> : "Change password"}
        </button>

        <button
          type="button"
          className="w-full text-center text-xs text-ink-muted hover:text-ink"
          onClick={() => {
            setUseBackupCode((v) => !v);
            setCode("");
            setError(null);
          }}
        >
          {useBackupCode ? "Use my authenticator app instead" : "Use a backup code instead"}
        </button>
      </form>
    </Panel>
  );
}
