"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { Alert, Busy, Field, Panel, buttonClass, inputClass } from "@/components/ui";

interface SetupPayload {
  secret: string;
  otpauthUri: string;
  qrDataUri: string;
}

export function EnrollFlow() {
  const router = useRouter();
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);

  async function beginSetup() {
    setBusy(true);
    setError(null);

    const result = await apiFetch<SetupPayload>("/api/auth/2fa/setup", {
      method: "POST",
    });
    setBusy(false);

    if (!result.ok) {
      if (result.error.code === "reauth_required") {
        setAlreadyEnrolled(true);
        return;
      }
      setError(result.error.message);
      return;
    }
    setSetup(result.data);
  }

  async function activate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await apiFetch<{
      backupCodes: string[];
      signedIn: boolean;
      emailVerificationRequired: boolean;
    }>("/api/auth/2fa/activate", { method: "POST", body: { code } });
    setBusy(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setNeedsEmailConfirmation(!result.data.signedIn);
    setBackupCodes(result.data.backupCodes);
  }

  if (alreadyEnrolled) {
    return (
      <Panel as="h1" title="You already have an authenticator">
        <p className="text-sm leading-relaxed text-ink-muted">
          This account already has two-factor authentication set up, so
          there is nothing to enrol here. Signing in will ask for a code
          from the authenticator app you used before — or one of your
          backup codes, if you no longer have it.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="btn-glow rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
          >
            Sign in
          </Link>
        </div>

        <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
          To replace your authenticator — a new phone, say — sign in first,
          then start enrolment from your account page. Issuing a new secret
          to a half-authenticated session would let anyone who learned your
          password alone swap out your second factor.
        </p>
      </Panel>
    );
  }

  if (backupCodes) {
    return (
      <Panel as="h1" title="Save your backup codes">
        <Alert tone="signal">
          These codes are shown once and cannot be recovered. Store them
          somewhere separate from your phone.
        </Alert>

        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          They are also how you get back in if you lose your phone or need to
          reset your password. If you lose both the authenticator app and
          these codes, we cannot recover the account for you.
        </p>

        <ul className="mt-4 grid grid-cols-2 gap-2">
          {backupCodes.map((c) => (
            <li
              key={c}
              className="glass-2 rounded-xl px-3 py-2 text-center font-mono text-sm tracking-widest text-ink"
            >
              {c}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-ink-faint">
          Each code works once. Use one if you lose access to your
          authenticator app.
        </p>

        <label className="mt-4 flex items-start gap-2.5 text-sm text-ink-muted">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          I have saved these codes somewhere safe.
        </label>

        {needsEmailConfirmation && (
          <div className="mt-4">
            <Alert tone="signal">
              One last step: we sent a confirmation link to your email address.
              Open it, then sign in. You cannot use the account until the
              address is confirmed.
            </Alert>
          </div>
        )}

        <button
          type="button"
          className={`${buttonClass} mt-4 w-full`}
          disabled={!acknowledged}
          onClick={() => {
            router.push(needsEmailConfirmation ? "/login" : "/dashboard");
            router.refresh();
          }}
        >
          {needsEmailConfirmation ? "Go to sign in" : "Continue to dashboard"}
        </button>
      </Panel>
    );
  }

  return (
    <Panel
      as="h1"
      title="Set up two-factor authentication"
      description="Scan this with an authenticator app, then enter the code it shows."
    >
      {error && <Alert>{error}</Alert>}

      {setup ? (
        <div className="space-y-5">
          <div className="flex justify-center rounded-lg border border-line bg-white p-4">
            <Image
              src={setup.qrDataUri}
              alt="QR code for authenticator app enrollment"
              width={240}
              height={240}
              unoptimized
            />
          </div>

          <div>
            <p className="text-xs text-ink-faint">
              Cannot scan? Enter this key manually:
            </p>
            <code className="mt-1 block overflow-x-auto rounded-xl border border-line bg-base/60 px-3 py-2 font-mono text-sm break-all text-ink">
              {setup.secret}
            </code>
          </div>

          <form method="post" onSubmit={activate} className="space-y-4">
            <Field label="Code from your app">
              <input
                className={`${inputClass} font-mono text-lg tracking-[0.4em]`}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                required
              />
            </Field>

            <button type="submit" className={`${buttonClass} w-full`} disabled={busy}>
              {busy ? <Busy>Verifying…</Busy> : "Confirm and enable"}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            You will need an authenticator app (1Password, Aegis, Google
            Authenticator, or similar). Generating a new secret replaces any
            authenticator you have previously set up on this account.
          </p>
          <button
            type="button"
            className={`${buttonClass} w-full`}
            onClick={beginSetup}
            disabled={busy}
          >
            {busy ? <Busy>Preparing…</Busy> : "Generate my authenticator secret"}
          </button>
        </div>
      )}
    </Panel>
  );
}
