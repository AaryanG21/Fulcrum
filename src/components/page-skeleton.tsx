export function PageSkeleton({ panels = 3 }: { panels?: number }) {
  return (
    <div className="flex min-h-screen flex-col" aria-busy="true">
      <div className="border-b border-line bg-surface/60">
        <div className="mx-auto flex h-[49px] max-w-6xl items-center px-6">
          <div className="pulse h-4 w-28 rounded bg-surface-3" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <p role="status" className="sr-only">
          Loading…
        </p>
        <div className="pulse mb-6 h-7 w-40 rounded bg-surface-3" />
        <div className="space-y-6">
          {Array.from({ length: panels }, (_, i) => (
            <div key={i} className="glass pulse rounded-2xl">
              <div className="border-b border-line px-5 py-4">
                <div className="h-4 w-36 rounded bg-surface-3" />
              </div>
              <div className="space-y-3 px-5 py-4">
                <div className="h-3 w-full rounded bg-surface-2" />
                <div className="h-3 w-5/6 rounded bg-surface-2" />
                <div className="h-3 w-2/3 rounded bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
