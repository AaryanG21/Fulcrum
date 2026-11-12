"use client";

import { useEffect, useRef, useState } from "react";
import { buttonGhostClass } from "@/components/ui";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2500);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className={`${buttonGhostClass} !px-2.5 !py-1 text-xs`}
      >
        {label}
      </button>
      <span role="status" aria-live="polite" className="text-xs text-ink-muted">
        {state === "copied" && "Copied"}
        {state === "failed" && "Could not copy — select the text instead"}
      </span>
    </span>
  );
}
