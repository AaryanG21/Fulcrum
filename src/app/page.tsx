import { ThemeSwitch } from "@/components/theme-switch";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { SiteFooter } from "@/components/site-footer";
import { Logo } from "@/components/logo";
import { Chip, InfoCircle, KeyLock, Scale, ShieldCheck } from "@/components/icons";
import { TryIt } from "@/components/try-it";

export const dynamic = "force-dynamic";

const EXAMPLE_PLAN = [
  { title: "No clickjacking protection", effort: 1, removes: 11 },
  { title: "Certificate near expiry", effort: 2, removes: 14 },
  { title: "MIME sniffing not disabled", effort: 1, removes: 4 },
  { title: "Obsolete cipher suites", effort: 2, removes: 4 },
] as const;

const CAPABILITIES = [
  {
    icon: ShieldCheck,
    title: "Header & transport posture",
    body: "Eight header checks — HSTS, CSP, frame options, MIME sniffing, referrer policy, permissions policy, version disclosure and cookie flags. TLS, including protocols, ciphers and the certificate chain, is examined by testssl.sh 3.2.4, pinned and run locally.",
  },
  {
    icon: Chip,
    title: "Version-aware CVE context",
    body: "Where a server advertises its version, that version is matched against a curated set of 16 CVEs covering common web server software, carrying EPSS exploitation likelihood rather than CVSS alone. It is a snapshot, not a vulnerability database, and every result says so.",
  },
  {
    icon: Scale,
    title: "Budget-aware remediation",
    body: "Set a fix-effort budget. The agent ranks remediations by risk reduced per unit of effort and shows the reasoning behind the order it chose — including when it defers the worst finding because three cheaper ones remove more risk.",
  },
  {
    icon: KeyLock,
    title: "Probing requires proof of ownership",
    body: "A headers check is one request, so it runs against any public site. The TLS scan opens hundreds of connections, so it runs only against a domain you have verified by DNS or a well-known file. Refusals are logged.",
  },
];

const NOT_CLAIMS = [
  "A passing grade means the checks Fulcrum runs did not find a problem. It is not a guarantee that a site is secure, and no tool — this one included — can offer that.",
  "Fulcrum inspects what is reachable from the outside: headers, TLS configuration, and version fingerprints.",
  "It does not review your application logic, your dependencies, your infrastructure, or your people. Treat the scorecard as one input among several.",
];

export const metadata = {
  title: { absolute: "Fulcrum — know what to fix first" },
  description:
    "Grade any website's security headers in seconds, or verify a domain you control for a full TLS scan. Returns a remediation plan ranked by risk removed per unit of effort, with the reasoning shown.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Fulcrum — know what to fix first",
    description:
      "A website security scorecard that tells you which few things to fix first, within the effort you have.",
    url: "/",
  },
};

const FAQ = [
  {
    q: "Is it safe to check a site I do not own?",
    a: "A headers check sends one ordinary HTTPS request, the same as a browser opening the page, and reads the response. It does not probe further, and it is rate-limited per person and per target. Anything heavier — the TLS scan, which opens hundreds of connections — only runs against a domain you have proved you control.",
  },
  {
    q: "What does the grade actually mean?",
    a: "It summarises only the checks Fulcrum runs: eight security-header checks, TLS configuration on full scans, and matches against a small curated set of known vulnerabilities for any software versions a server discloses. A serious finding cannot be averaged away by passing everything else. It is not a statement that a site is or is not secure.",
  },
  {
    q: "How do I prove I own a domain?",
    a: "Publish a TXT record Fulcrum gives you, or serve a small file at a fixed path on the site. Either needs control of the domain, and the DNS method is the stronger of the two. The proof expires after a set period — 90 days by default — and you renew it by running the same check again, because who owns a domain can change.",
  },
  {
    q: "Why do I need an authenticator app?",
    a: "Every account uses a 6-digit code from an authenticator app as well as a password, including when you reset a password. An account on a security tool is worth attacking, and a code that changes every 30 seconds is what makes a stolen password not enough. Keep the backup codes you are shown: they are the way back in if you lose your phone.",
  },
  {
    q: "What happens to my data?",
    a: "Your email address, a hash of your password, the domains you register and your scan results are stored so the service works. You can download everything or delete your account from the account page. Security audit records that name you are kept for a limited time and then destroyed. The privacy policy lists every field.",
  },
  {
    q: "Does it cost anything?",
    a: "No. Fulcrum is free to use.",
  },
] as const;

function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default function Home() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Fulcrum",
      applicationCategory: "SecurityApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      description:
        "A website security scorecard that grades a site from A to F and returns a remediation plan ranked to a fix-effort budget.",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {structuredData.map((block, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(block) }}
        />
      ))}
      <header className="glass sticky top-0 z-40 rounded-none border-x-0 border-t-0">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-base font-semibold tracking-tight text-ink">
              Fulcrum
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitch />
            <Link
              href="/login"
              className="rounded-xl px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="glass-2 rounded-xl px-3.5 py-1.5 text-sm text-ink transition-colors hover:border-signal-ink/50"
            >
              Create account
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <section className="grid-backdrop">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
            <div>
              <Badge tone="signal">Scorecard + remediation agent</Badge>
              <h1 className="display mt-6 text-5xl text-ink sm:text-6xl lg:text-[4.25rem]">
                Know what to fix first,
                <br />
                <span className="text-gradient">within the effort you have.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-muted">
                Fulcrum grades a site&rsquo;s security posture from A to F and
                returns a remediation plan sized to a fix-effort budget you
                set — with the reasoning shown, not just a number. Check any
                site&rsquo;s headers in a second; prove you control a domain to
                run the full scan, including TLS.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="btn-glow rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
                >
                  Get started
                </Link>
                <Link
                  href="/login"
                  className="glass-2 rounded-xl px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-signal-ink/50"
                >
                  Sign in
                </Link>
              </div>
              <p className="mt-4 font-mono text-xs text-ink-muted">
                2FA required on every account · TLS scanning restricted to
                verified domains
              </p>
            </div>

            <figure className="m-0">
              <div className="glass aspect-[4/3] rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-sev-high/50 bg-sev-high/10 font-mono text-3xl font-bold text-sev-high">
                    D
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-ink">
                      example.com
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Score 50/100 · 10 findings
                    </p>
                  </div>
                </div>

                <ol className="mt-5 space-y-2">
                  {EXAMPLE_PLAN.map((step) => (
                    <li
                      key={step.title}
                      className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-2 text-xs last:border-0"
                    >
                      <span className="truncate text-ink-muted">
                        {step.title}
                      </span>
                      <span className="shrink-0 font-mono text-ink-muted">
                        {step.effort}pt → &minus;{step.removes}
                      </span>
                    </li>
                  ))}
                </ol>

                <p className="mt-4 font-mono text-[11px] tracking-wide text-ink-muted">
                  budget 15 · 14 used · 3 deferred
                </p>
              </div>
              <figcaption className="mt-2 text-center text-xs text-ink-muted">
                Example output. Not a real site&rsquo;s result.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-4">
          <TryIt />
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="display text-3xl text-ink sm:text-4xl">
            What the agent does
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {CAPABILITIES.map((item) => (
              <div
                key={item.title}
                className="glass lift rounded-2xl p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-signal-ink/30 bg-signal/20 text-signal-ink">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <h2 className="display text-3xl text-ink sm:text-4xl">
            Questions
          </h2>
          <dl className="mt-8 grid gap-5 md:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q} className="glass-2 rounded-2xl p-6">
                <dt className="font-display text-base font-semibold tracking-tight text-ink">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="glass rounded-2xl px-6 py-10 sm:px-10">
            <h2 className="display text-3xl text-ink sm:text-4xl">
              What this is not
            </h2>
            <ul className="mt-6 max-w-3xl space-y-3">
              {NOT_CLAIMS.map((claim) => (
                <li key={claim} className="flex gap-2.5">
                  <InfoCircle className="mt-0.5 h-4 w-4 shrink-0 text-signal-ink" />
                  <span className="text-sm leading-relaxed text-ink-muted">
                    {claim}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
