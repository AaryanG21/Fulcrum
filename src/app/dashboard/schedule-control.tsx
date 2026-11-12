"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { Alert, Busy, buttonGhostClass, inputClass } from "@/components/ui";

export interface ScheduleState {
  intervalDays: number;
  notifyOnRegression: boolean;
  enabled: boolean;
  nextRunAt: string;
  pausedReason: string | null;
}

export function ScheduleControl({
  domainId,
  schedule,
}: {
  domainId: string;
  schedule: ScheduleState | null;
}) {
  const router = useRouter();
  const [interval, setIntervalDays] = useState<string>(
    schedule ? String(schedule.intervalDays) : "off",
  );
  const [notify, setNotify] = useState(schedule?.notifyOnRegression ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectId = `schedule-${domainId}`;
  const notifyId = `schedule-notify-${domainId}`;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    const result =
      interval === "off"
        ? await apiFetch(`/api/domains/${domainId}/schedule`, { method: "DELETE" })
        : await apiFetch(`/api/domains/${domainId}/schedule`, {
            method: "PUT",
            body: { intervalDays: Number(interval), notifyOnRegression: notify },
          });

    setBusy(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const paused = schedule && !schedule.enabled;

  return (
    <form
      method="post"
      onSubmit={save}
      aria-busy={busy}
      className="mt-3 border-t border-line pt-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={selectId} className="block text-xs font-medium text-ink-muted">
            Scheduled scan
          </label>
          <select
            id={selectId}
            className={`${inputClass} mt-1 !w-auto !py-1.5 text-sm`}
            value={interval}
            onChange={(e) => setIntervalDays(e.target.value)}
          >
            <option value="off">Off</option>
            <option value="7">Weekly</option>
            <option value="30">Monthly</option>
          </select>
        </div>

        {interval !== "off" && (
          <label htmlFor={notifyId} className="flex items-center gap-2 pb-2 text-sm text-ink-muted">
            <input
              id={notifyId}
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
            />
            Email me if the result gets worse
          </label>
        )}

        <button type="submit" className={`${buttonGhostClass} !py-1.5 text-sm`} disabled={busy}>
          {busy ? <Busy>Saving…</Busy> : "Save"}
        </button>
      </div>

      {schedule?.enabled && (
        <p className="mt-2 text-xs text-ink-muted">
          Next scan on {schedule.nextRunAt.slice(0, 10)}. It runs only while this domain&rsquo;s
          ownership is still verified.
        </p>
      )}

      {paused && (
        <div className="mt-2">
          <Alert tone="neutral">
            This schedule is paused{schedule.pausedReason ? `: ${schedule.pausedReason}` : "."}{" "}
            Saving it again turns it back on once the domain is verified.
          </Alert>
        </div>
      )}

      {error && (
        <div className="mt-2">
          <Alert>{error}</Alert>
        </div>
      )}
      {saved && !error && (
        <p role="status" className="mt-2 text-xs text-signal-ink">
          Saved.
        </p>
      )}
    </form>
  );
}
