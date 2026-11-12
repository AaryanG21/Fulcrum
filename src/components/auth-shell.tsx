import { ThemeSwitch } from "@/components/theme-switch";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export function AuthShell({
  children,
  below,
  width = "md",
}: {
  children: ReactNode;
  width?: "md" | "lg";
  below?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-base font-semibold tracking-tight text-ink">
              Fulcrum
            </span>
          </Link>
          <ThemeSwitch />
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 items-center justify-center px-6 py-16 focus:outline-none"
      >
        <div className={`w-full ${width === "lg" ? "max-w-lg" : "max-w-md"}`}>
          {children}
          {below && <div className="mt-6 text-center text-sm text-ink-muted">{below}</div>}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
