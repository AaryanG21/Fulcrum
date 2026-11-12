"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { ScanProgress } from "@/components/scan-progress";

const POLL_MS = 5_000;

const MAX_POLLS = 180;

export function ScanStatusWatcher({
  scanId,
  status,
  startedAtMs,
}: {
  scanId: string;
  status: "QUEUED" | "RUNNING";
  startedAtMs: number;
}) {
  const router = useRouter();

  const pollsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const id = setInterval(async () => {
      if (cancelled) return;

      if (++pollsRef.current > MAX_POLLS) {
        clearInterval(id);
        return;
      }

      const result = await apiFetch<{ status: string }>(`/api/scans/${scanId}`);
      if (cancelled) return;

      if (!result.ok) {
        if (result.error.status === 404 || result.error.status === 401) {
          clearInterval(id);
        }
        return;
      }

      const current = result.data.status;
      if (current !== "RUNNING" && current !== "QUEUED") {
        clearInterval(id);
        router.refresh();
      } else if (current !== status) {
        clearInterval(id);
        router.refresh();
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [scanId, status, router]);

  return <ScanProgress startedAtMs={startedAtMs} queued={status === "QUEUED"} />;
}
