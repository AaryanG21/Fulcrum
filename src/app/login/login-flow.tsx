"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { Alert, Busy, Field, Panel, buttonClass, inputClass } from "@/components/ui";

type Step = "password" | "totp" | "enroll" | "unverified";

export function LoginFlow({ next }: { next: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  async function resendConfirmation() {
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
    setResent(true);
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await apiFetch<{ status: string }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setPassword("");
    if (result.data.status === "email_unverified") {
      setStep("unverified");
      return;
    }
    setStep(result.data.status === "totp_required" ? "totp" : "enroll");
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await apiFetch<{ role: string; remainingBackupCodes: number }>(
      "/api/auth/2fa/verify",
      {
        method: "POST",
        body: useBackupCode ? { backupCode: code } : { code },
      },
    );

    setBusy(false);

    if (!result.ok) {
      setError(result.error.message);
      if (result.error.code === "mfa_session_expired") setStep("password");
      return;
    }

    router.push(next ?? (result.data.role === "ADMIN" ? "/admin" : "/dashboard"));
    router.refresh();
  }

  if (step === "unverified") {
    return (
      <Panel as="h1" title="Confirm your email first">
        <p className="text-sm text-ink-muted">
          Your password is right, but the address on this account has not been
          confirmed yet. Open the message we sent to{" "}
          <span className="font-mono text-ink">{email}</span> and follow the link, then
          sign in again.
        </p>

        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}
        {resent && (
          <div className="mt-3">
            <Alert tone="signal">
              If that address has an unconfirmed account, a new link is on its way. It
              can take a minute.
            </Alert>
          </div>
        )}

        <button
          type="button"
          className={`${buttonClass} mt-4 w-full`}
          disabled={busy}
          onClick={resendConfirmation}
        >
          {busy ? <Busy>Sending…</Busy> : "Send the confirmation email again"}
        </button>
        <button
          type="button"
          className="mt-3 w-full text-center text-xs text-ink-muted hover:text-ink"
          onClick={() => {
            setStep("password");
            setResent(false);
            setError(null);
          }}
        >
          Back to sign in
        </button>
      </Panel>
    );
  }

  if (step === "enroll") {
    return (
      <Panel as="h1" title="Two-factor setup required">
        <p className="text-sm text-ink-muted">
          Every account on Fulcrum uses an authenticator app. Finish enrollment
          to continue — it takes about a minute.
        </p>
        <button
          type="button"
          className={`${buttonClass} mt-4 w-full`}
          onClick={() => router.push("/enroll")}
        >
          Set up two-factor authentication
        </button>
      </Panel>
    );
  }

  if (step === "totp") {
    return (
      <Panel as="h1" title="Verification code">
        <form method="post" onSubmit={submitCode} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          {useBackupCode ? (
            <Field
              label="Backup code"
              hint="One of the single-use codes you saved at enrollment."
            >
              <input
                className={`${inputClass} font-mono tracking-widest`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                placeholder="XXXX-XXXX"
                required
              />
            </Field>
          ) : (
            <Field label="6-digit code" hint="From your authenticator app.">
              <input
                className={`${inputClass} font-mono text-lg tracking-[0.4em]`}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                required
                autoFocus
              />
            </Field>
          )}

          <button type="submit" className={`${buttonClass} w-full`} disabled={busy}>
            {busy ? <Busy>Verifying…</Busy> : "Verify"}
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
            {useBackupCode ? "Use my authenticator app instead" : "Use a backup code"}
          </button>
        </form>
      </Panel>
    );
  }

  return (
    <Panel as="h1" title="Sign in">
      <form method="post" onSubmit={submitPassword} className="space-y-4">
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

        <Field label="Password">
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        <button type="submit" className={`${buttonClass} w-full`} disabled={busy}>
          {busy ? <Busy>Checking…</Busy> : "Continue"}
        </button>

        <p className="text-center text-xs text-ink-faint">
          A second factor is required after this step.
        </p>

        <p className="text-center text-xs">
          <Link href="/forgot-password" className="text-ink-muted underline hover:text-ink">
            Forgot your password?
          </Link>
        </p>
      </form>
    </Panel>
  );
}
