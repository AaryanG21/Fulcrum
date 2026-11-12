import { errorMessage, log } from "@/lib/log";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getEnv } = await import("@/lib/env");

  getEnv();

  const { pruneDeadSessions, pruneExpiredAuthTokens, reapExpiredQueuedScans, reapStalledScans } = await import(
    "@/lib/agent/reaper"
  );
  try {
    const expired = await reapExpiredQueuedScans();
    if (expired > 0) {
      log.warn("cancelled scans that waited in the queue too long", { count: expired });
    }

    const reaped = await reapStalledScans();
    if (reaped > 0) {
      log.warn("marked stalled scans as failed at startup", { count: reaped });
    }

    const tokens = await pruneExpiredAuthTokens();
    if (tokens > 0) {
      log.info("pruned expired email tokens at startup", { count: tokens });
    }

    const pruned = await pruneDeadSessions();
    if (pruned > 0) {
      log.info("pruned dead session records at startup", { count: pruned });
    }
  } catch (error) {
    log.error("could not reconcile stalled scans at startup", {
      error: errorMessage(error),
    });
  }

  const { startScanWorker } = await import("@/lib/agent/worker");
  startScanWorker();
}
