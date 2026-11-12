"use client";

import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui";

const SEEN_KEY = "fulcrum.authenticator-notice";

function alreadySeen(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
  }
}

export function AuthenticatorNotice() {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || alreadySeen()) return;
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
  }, []);

  function close() {
    markSeen();
    ref.current?.close();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="authenticator-notice-title"
      onClose={markSeen}
      className="m-auto w-[min(92vw,30rem)] rounded-lg border border-line-bright bg-surface p-0 text-ink backdrop:bg-black/70"
    >
      <div className="p-6">
        <h2 id="authenticator-notice-title" className="text-lg font-semibold">
          You will need an authenticator app
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Fulcrum asks for a 6-digit code from an authenticator app every time you sign
          in, and again if you ever reset your password. Install one on your phone
          before you continue.
        </p>

        <p className="mt-3 text-sm text-ink-muted">Any of these work:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">
          <li>Google Authenticator</li>
          <li>Microsoft Authenticator</li>
          <li>Authy</li>
          <li>1Password, Bitwarden or another password manager with one built in</li>
        </ul>

        <div className="glass-2 mt-4 rounded-xl p-3 text-sm leading-relaxed text-ink-muted">
          <p className="font-medium text-ink">Save your backup codes</p>
          <p className="mt-1">
            After setup you are shown ten single-use backup codes, once. They are the
            only way in if you lose your phone. Store them somewhere other than that
            phone. If you lose both the app and the codes, we cannot recover the
            account for you.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button type="button" className={buttonClass} onClick={close} autoFocus>
            I have an app — continue
          </button>
        </div>
      </div>
    </dialog>
  );
}
