import { describe, it } from "vitest";

/**
 * SCAFFOLD ONLY — assertions are hand-written by the project author.
 *
 * Covers src/lib/agent/scheduler.ts. Needs a real database. A schedule must
 * never be a way AROUND authorization — every one of these is a way of
 * checking that.
 */

describe("enqueueDueSchedules", () => {
  it("queues one FULL scan for a due schedule and advances nextRunAt by the interval", () => {
    // TODO: also lastRunAt, the budget, and SCAN_REQUESTED with scheduled:true
  });

  it("does nothing for a schedule that is not yet due", () => {
    // TODO
  });

  it("queues exactly one scan when several workers race for the same schedule", () => {
    // TODO: N concurrent calls -> one scan. The claim is a conditional update.
  });

  it("pauses, rather than scans, when the verification has gone stale", () => {
    // TODO: enabled false, pausedReason set, SCAN_SCHEDULE_PAUSED, email sent
  });

  it("pauses for a revoked domain and for a suspended account", () => {
    // TODO
  });

  it("does not pick a paused schedule up again", () => {
    // TODO
  });

  it("does not advance nextRunAt when the queue is full", () => {
    // TODO: it must be picked up next tick, not silently skipped for a week
  });

  it("works through at most MAX_PER_TICK schedules per call", () => {
    // TODO
  });
});

describe("alertIfRegressed", () => {
  it("emails when the score fell", () => {
    // TODO: mock @/lib/email/send and capture
  });

  it("emails when the score did NOT fall but a new HIGH/CRITICAL appeared", () => {
    // TODO: and the wording must not claim the score fell
  });

  it("is silent when the score rose and nothing serious is new", () => {
    // TODO
  });

  it("is silent when alerts are off, the schedule is paused, or there is no schedule", () => {
    // TODO
  });

  it("is silent when there is no previous scan", () => {
    // TODO
  });

  it("compares only against a previous FULL scan of the same host and user", () => {
    // TODO
  });

  it("sends only to the owner", () => {
    // TODO
  });

  it("never throws", () => {
    // TODO: a failing mail server must not fail the scan
  });
});
