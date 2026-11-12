"use client";

import { useSyncExternalStore } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

function effectiveTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(notify: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", notify);
  window.addEventListener("fulcrum-theme", notify);
  return () => {
    media.removeEventListener("change", notify);
    window.removeEventListener("fulcrum-theme", notify);
  };
}

export function ThemeSwitch({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore<Theme | null>(subscribe, effectiveTheme, () => null);

  const toggle = () => {
    const next: Theme = (theme ?? effectiveTheme()) === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    window.dispatchEvent(new Event("fulcrum-theme"));
  };

  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === null ? undefined : dark}
      aria-label="Dark theme"
      onClick={toggle}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-ink/8 hover:text-ink ${className}`}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className="h-[18px] w-[18px]" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true" focusable="false">
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
        </svg>
      )}
    </button>
  );
}
