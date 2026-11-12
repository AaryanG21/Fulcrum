import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen focus:outline-none items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm tracking-widest text-ink-faint uppercase">
          404
        </p>
        <h1 className="display mt-3 text-4xl text-ink">No such page</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          This address does not correspond to anything. If you followed a link
          to a scan or a domain, it may have been removed — or it may belong to
          another account, which looks identical from here on purpose.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md border border-line-bright px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
        >
          Back to the start
        </Link>
      </div>
    </main>
  );
}
