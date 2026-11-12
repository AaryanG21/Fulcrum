"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { Alert, Badge, Busy, Field, Panel, buttonClass, buttonGhostClass, inputClass } from "@/components/ui";

interface AdminUser {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "PENDING_2FA" | "ACTIVE" | "SUSPENDED";
  twoFactorEnabled: boolean;
  failedLoginCount: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { domains: number; scans: number };
}

interface AdminDomain {
  id: string;
  hostname: string;
  verificationStatus: "PENDING" | "VERIFIED" | "FAILED" | "REVOKED";
  verifiedAt: string | null;
  createdAt: string;
  user: { email: string };
}

type PendingAction =
  | { kind: "user"; userId: string; action: "suspend" | "reinstate" | "unlock"; label: string }
  | { kind: "domain"; domainId: string; label: string };

export function AdminConsole({
  currentUserId,
  users,
  domains,
}: {
  currentUserId: string;
  users: AdminUser[];
  domains: AdminDomain[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setPending(null);
    setReason("");
    setPassword("");
    setCode("");
    setError(null);
  }

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pending && !dialog.open) dialog.showModal();
    if (!pending && dialog.open) dialog.close();
  }, [pending]);

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (!pending) return;

    setBusy(true);
    setError(null);

    const stepUp = await apiFetch("/api/auth/reauth", {
      method: "POST",
      body: { password, code },
    });

    if (!stepUp.ok) {
      setBusy(false);
      setError(stepUp.error.message);
      return;
    }

    const result =
      pending.kind === "user"
        ? await apiFetch(`/api/admin/users/${pending.userId}/status`, {
            method: "POST",
            body: { action: pending.action, reason },
          })
        : await apiFetch(`/api/admin/domains/${pending.domainId}/revoke`, {
            method: "POST",
            body: { reason },
          });

    setBusy(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setNotice(`${pending.label} — done.`);
    reset();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {notice && <Alert tone="signal">{notice}</Alert>}

      <dialog
        ref={dialogRef}
        aria-label="Confirm with re-authentication"
        onCancel={(event) => {
          event.preventDefault();
          reset();
        }}
        className="m-auto w-[min(92vw,34rem)] rounded-lg border border-line-bright bg-surface p-0 text-ink backdrop:bg-black/70"
      >
        {pending && (
          <Panel
            title="Confirm with re-authentication"
            description="Destructive actions require your password and a current 2FA code."
          >
          <form method="post" onSubmit={confirm} className="space-y-4">
            {error && <Alert>{error}</Alert>}

            <p className="text-sm text-ink-muted">
              About to: <span className="text-ink">{pending.label}</span>
            </p>

            <Field label="Reason" hint="Recorded in the audit log.">
              <input
                className={inputClass}
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={3}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your password">
                <input
                  className={inputClass}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Field>

              <Field label="2FA code">
                <input
                  className={`${inputClass} font-mono tracking-[0.3em]`}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  required
                />
              </Field>
            </div>

            <div className="flex gap-3">
              <button type="submit" className={buttonClass} disabled={busy}>
                {busy ? <Busy>Confirming…</Busy> : "Confirm"}
              </button>
              <button type="button" className={buttonGhostClass} onClick={reset}>
                Cancel
              </button>
            </div>
          </form>
          </Panel>
        )}
      </dialog>

      <Panel title="Users">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-ink-faint uppercase">
                <th scope="col" className="pb-2 font-medium">Email</th>
                <th scope="col" className="pb-2 font-medium">Role</th>
                <th scope="col" className="pb-2 font-medium">Status</th>
                <th scope="col" className="pb-2 font-medium">2FA</th>
                <th scope="col" className="pb-2 font-medium">Domains</th>
                <th scope="col" className="pb-2 font-medium">Failed</th>
                <th scope="col" className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const locked =
                  user.lockedUntil !== null && new Date(user.lockedUntil) > new Date();

                return (
                  <tr key={user.id} className="border-b border-line/50 last:border-0">
                    <td className="py-2 font-mono text-ink">{user.email}</td>
                    <td className="py-2 text-ink-muted">{user.role.toLowerCase()}</td>
                    <td className="py-2">
                      <Badge
                        tone={
                          user.status === "ACTIVE"
                            ? "signal"
                            : user.status === "SUSPENDED"
                              ? "critical"
                              : "medium"
                        }
                      >
                        {user.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="py-2 text-ink-muted">
                      {user.twoFactorEnabled ? "yes" : "no"}
                    </td>
                    <td className="py-2 font-mono text-ink-muted">
                      {user._count.domains}
                    </td>
                    <td className="py-2 font-mono text-ink-muted">
                      {user.failedLoginCount}
                      {locked && <span className="ml-1 text-sev-critical">locked</span>}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {user.status === "SUSPENDED" ? (
                          <ActionButton
                            onClick={() =>
                              setPending({
                                kind: "user",
                                userId: user.id,
                                action: "reinstate",
                                label: `reinstate ${user.email}`,
                              })
                            }
                          >
                            Reinstate
                          </ActionButton>
                        ) : (
                          <ActionButton
                            disabled={user.id === currentUserId}
                            title={
                              user.id === currentUserId
                                ? "You cannot suspend your own account"
                                : undefined
                            }
                            onClick={() =>
                              setPending({
                                kind: "user",
                                userId: user.id,
                                action: "suspend",
                                label: `suspend ${user.email}`,
                              })
                            }
                          >
                            Suspend
                          </ActionButton>
                        )}

                        {locked && (
                          <ActionButton
                            onClick={() =>
                              setPending({
                                kind: "user",
                                userId: user.id,
                                action: "unlock",
                                label: `unlock ${user.email}`,
                              })
                            }
                          >
                            Unlock
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Domains">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-ink-faint uppercase">
                <th scope="col" className="pb-2 font-medium">Hostname</th>
                <th scope="col" className="pb-2 font-medium">Owner</th>
                <th scope="col" className="pb-2 font-medium">Status</th>
                <th scope="col" className="pb-2 font-medium">Verified</th>
                <th scope="col" className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((domain) => (
                <tr key={domain.id} className="border-b border-line/50 last:border-0">
                  <td className="py-2 font-mono text-ink">{domain.hostname}</td>
                  <td className="py-2 font-mono text-ink-muted">{domain.user.email}</td>
                  <td className="py-2">
                    <Badge
                      tone={
                        domain.verificationStatus === "VERIFIED"
                          ? "signal"
                          : domain.verificationStatus === "REVOKED"
                            ? "critical"
                            : "medium"
                      }
                    >
                      {domain.verificationStatus.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="py-2 text-ink-faint">
                    {domain.verifiedAt?.slice(0, 10) ?? "—"}
                  </td>
                  <td className="py-2">
                    {domain.verificationStatus === "VERIFIED" && (
                      <ActionButton
                        onClick={() =>
                          setPending({
                            kind: "domain",
                            domainId: domain.id,
                            label: `revoke verification for ${domain.hostname}`,
                          })
                        }
                      >
                        Revoke
                      </ActionButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded border border-line-bright px-2 py-1 text-xs text-ink-muted transition-colors hover:border-signal/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
