import { CopyButton } from "@/components/copy-button";
import { fixGuideFor } from "@/lib/agent/fix-snippets";

export function FixGuide({ checkId }: { checkId: string }) {
  const guide = fixGuideFor(checkId);
  if (!guide) return null;

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-signal-ink hover:underline">
        How to fix this
      </summary>

      <div className="mt-2 space-y-3">
        {guide.note && (
          <p className="text-xs leading-relaxed text-ink-muted">{guide.note}</p>
        )}

        {guide.variants.map((variant) => (
          <div key={variant.label}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-ink-muted">{variant.label}</span>
              <CopyButton text={variant.code} label="Copy" />
            </div>
            <pre className="mt-1 overflow-x-auto rounded-xl border border-line bg-base/60 p-3 font-mono text-xs leading-relaxed text-ink">
              <code>{variant.code}</code>
            </pre>
          </div>
        ))}
      </div>
    </details>
  );
}
