"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { Alert, Busy, Field, Panel, buttonClass, inputClass } from "@/components/ui";

const MIN_LENGTH = 12;

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
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
    const result = await apiFetch<{ status: string }>("/api/auth/register", {
      method: "POST",
      body: { email, password, acceptedTerms },
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error.message);
      if (result.error.details) setFieldErrors(result.error.details);
      return;
    }

    setPassword("");
    setConfirm("");
    router.push("/enroll");
  }

  return (
    <Panel as="h1" title="Create account">
      <form method="post" onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <Field label="Email" error={fieldErrors.email?.[0]}>
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

        <Field
          label="Password"
          hint={`At least ${MIN_LENGTH} characters. Length matters more than symbols.`}
          error={fieldErrors.password?.[0]}
        >
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_LENGTH}
            required
          />
        </Field>

        <Field label="Confirm password" error={fieldErrors.confirm?.[0]}>
          <input
            className={inputClass}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        <label className="flex items-start gap-2.5 text-sm text-ink-muted">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-signal"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            required
          />
          <span>
            I am 18 or older and I accept the{" "}
            <Link href="/terms" className="text-signal-ink hover:underline">
              Terms of service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-signal-ink hover:underline">
              Privacy policy
            </Link>
            .
          </span>
        </label>

        {fieldErrors.acceptedTerms?.[0] && (
          <p role="alert" className="text-xs text-sev-critical">
            {fieldErrors.acceptedTerms[0]}
          </p>
        )}

        <button
          type="submit"
          className={`${buttonClass} w-full`}
          disabled={busy || !acceptedTerms}
        >
          {busy ? <Busy>Creating…</Busy> : "Create account"}
        </button>

        <p className="text-xs text-ink-faint">
          You will be asked to set up an authenticator app next. Two-factor
          authentication is required on every account.
        </p>
      </form>
    </Panel>
  );
}
