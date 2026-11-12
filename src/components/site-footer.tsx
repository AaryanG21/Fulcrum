import Link from "next/link";
import { OPERATOR } from "@/lib/legal/operator";

export function SiteFooter() {
  return (
    <footer className="border-t border-line/60 bg-base/40">
      <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-ink-muted">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-sm">
            <p className="font-display text-sm font-semibold tracking-tight text-ink">
              Fulcrum{" "}
              <span className="font-sans text-xs font-normal text-ink-muted">
                · defence in depth, honestly described
              </span>
            </p>
            <p className="mt-2 leading-relaxed">
              Operated by {OPERATOR.name}, {OPERATOR.legalForm}.
            </p>
            <p className="mt-1 leading-relaxed">
              Contact:{" "}
              <a
                href={`mailto:${OPERATOR.contactEmail}`}
                className="text-signal-ink hover:underline"
              >
                {OPERATOR.contactEmail}
              </a>
            </p>
          </div>

          <nav aria-label="Legal and policies">
            <h2 className="eyebrow text-ink-muted">Policies</h2>
            <ul className="mt-2 space-y-1.5">
              <li>
                <Link href="/privacy" className="hover:text-ink hover:underline">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-ink hover:underline">
                  Terms of service
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-ink hover:underline">
                  Cookie policy
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-6 border-t border-line pt-4 leading-relaxed">
          Full scans require proving you control the domain. Headers-only
          checks send a single request and are rate limited. Do not use this
          service to generate traffic against a site on anyone&rsquo;s behalf.
        </p>
      </div>
    </footer>
  );
}
