import { describe, it } from "vitest";

/**
 * SCAFFOLD ONLY — assertions are hand-written by the project author.
 *
 * Covers src/lib/agent/worker.ts and the queued-expiry in reaper.ts.
 *
 * Mock `@/lib/agent/run` so runScan returns a promise you control. That is
 * what lets a test hold jobs open, make one throw, or make one fail, and it
 * keeps testssl.sh out of the run. These need a real database for the status
 * transitions (the claim is a predicated UPDATE, so mocking Prisma would test
 * nothing).
 */

describe("claimNextScan", () => {
  it("claims the oldest queued scan first", () => {
    // TODO: two queued rows, different createdAt -> the older one is returned
  });

  it("lets exactly one of several simultaneous claimers win a row", () => {
    // TODO: N concurrent claims on one QUEUED row -> exactly one non-null.
    // This is the whole correctness argument for having no SKIP LOCKED.
  });

  it("moves the claimed row to RUNNING and stamps startedAt", () => {
    // TODO
  });

  it("returns null on an empty queue", () => {
    // TODO
  });
});

describe("processScan", () => {
  it("writes COMPLETED with score, grade and plan on success", () => {
    // TODO
  });

  it("writes FAILED when runScan reports a failure", () => {
    // TODO: reason is stored, SCAN_FAILED audited
  });

  it("writes FAILED and does not reject when runScan throws", () => {
    // TODO: the promise resolves, the row is terminal. An unhandled rejection
    // here would take the whole server down, which is the thing guarded.
  });

  it("audits completion with the actor but no ip or user-agent", () => {
    // TODO: there is no request to take them from; SCAN_REQUESTED has them
  });
});

describe("fillSlots", () => {
  it("never starts more scans than the concurrency cap", () => {
    // TODO: 5 queued, cap 2 -> started 2, active 2, three still QUEUED
  });

  it("starts nothing while every slot is taken", () => {
    // TODO
  });

  it("frees a slot when a job ends, whether it succeeded or failed", () => {
    // TODO
  });
});

describe("reapExpiredQueuedScans", () => {
  it("fails queued scans older than the expiry", () => {
    // TODO: error message must say nothing was scanned
  });

  it("leaves recent queued scans alone", () => {
    // TODO
  });

  it("does not touch RUNNING scans", () => {
    // TODO: those belong to reapStalledScans
  });
});

describe("POST /api/scans queue behaviour", () => {
  it("returns 202 with a scan id and creates the row QUEUED", () => {
    // TODO
  });

  it("refuses with 429 once the queue is at SCAN_QUEUE_MAX_DEPTH", () => {
    // TODO
  });

  it("still refuses and audits a stale, unverified or not-owned domain", () => {
    // TODO: the authorization path must be unchanged by queueing
  });
});
