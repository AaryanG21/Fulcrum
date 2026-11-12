import { ThemeSwitch } from "@/components/theme-switch";
import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { Logo } from "@/components/logo";

export function AppShell({
  email,
  isAdmin,
  active,
  title,
  children,
}: {
  email: string;
  isAdmin: boolean;
  active: "dashboard" | "admin" | "account";
  title?: string;
  children: ReactNode;
}) {
  const navItem = (href: string, key: typeof active, label: string) => (
    <Link
      key={key}
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`relative rounded-xl px-3 py-1.5 text-sm transition-colors ${
        active === key
          ? "bg-ink/8 text-ink after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-4 after:-translate-x-1/2 after:rounded-full after:bg-accent"
          : "text-ink-muted hover:bg-ink/5 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-40 rounded-none border-x-0 border-t-0 print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Logo />
              <span className="font-display text-base font-semibold tracking-tight text-ink">
                Fulcrum
              </span>
            </Link>
            <nav aria-label="Primary" className="flex items-center gap-1">
              {navItem("/dashboard", "dashboard", "Dashboard")}
              {navItem("/account", "account", "Account")}
              {isAdmin && navItem("/admin", "admin", "Admin")}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitch />
            <span className="font-mono text-xs text-ink-faint">{email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 focus:outline-none"
      >
        {title && <h1 className="display mb-8 text-3xl text-ink sm:text-4xl">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
