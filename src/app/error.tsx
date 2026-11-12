"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen focus:outline-none items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm tracking-widest text-sev-high uppercase">
          Error
        </p>
        <h1 className="mt-3 text-xl text-ink">Something failed on our side</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          The request did not complete. Nothing was changed by the attempt.
          Trying again is safe.
        </p>

        {error.digest && (
          <p className="mt-4 font-mono text-xs text-ink-faint">
            reference {error.digest}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-line-bright px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-md border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2"
          >
            Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
