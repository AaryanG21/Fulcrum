import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { JURISDICTION, OPERATOR, isConfigured } from "@/lib/legal/operator";
import { ThemeSwitch } from "@/components/theme-switch";
import { Logo } from "@/components/logo";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-base font-semibold tracking-tight text-ink">
              Fulcrum
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSwitch />
            <Link
              href="/"
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              Back to site
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1} className="focus:outline-none mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        {!isConfigured && (
          <div
            role="alert"
            className="mb-8 rounded-lg border border-sev-critical/50 bg-sev-critical/10 p-4 text-sm text-sev-critical"
          >
            <p className="font-semibold">
              This document is not ready to publish.
            </p>
            <p className="mt-1.5 leading-relaxed">
              The operator details in{" "}
              <code className="font-mono">src/lib/legal/operator.ts</code> still
              contain placeholders. Under the {JURISDICTION.lawShort} a privacy
              notice must identify the Data Fiduciary and publish a contact for
              grievances; this one currently does neither.
            </p>
          </div>
        )}

        <article className="legal-prose">{children}</article>

        <p className="mt-12 border-t border-line pt-6 text-xs text-ink-muted">
          Last updated {OPERATOR.lastUpdated}.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
