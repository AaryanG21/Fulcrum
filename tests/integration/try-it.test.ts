import { describe, it } from "vitest";

/**
 * SCAFFOLD ONLY — assertions are hand-written by the project author.
 *
 * Covers POST /api/try, the anonymous landing-page check. With no account to
 * attribute abuse to, the limits and the narrowness of the response are the
 * whole of the defence. Mock `@/lib/agent/run`; never hit the network.
 */

describe("what it can do", () => {
  it("always calls runScan with includeTls: false", () => {
    // TODO: and that no request field can change it. This is the guarantee
    // that a stranger cannot point testssl.sh at a third party.
  });

  it("stores nothing", () => {
    // TODO: no ScanResult row is created
  });
});

describe("what it returns", () => {
  it("returns a summary: grade, score, counts and at most five findings", () => {
    // TODO
  });

  it("never includes the evidence field or a description", () => {
    // TODO: the one place target-supplied text lives must not reach the response
  });

  it("is Cache-Control: no-store", () => {
    // TODO
  });
});

describe("what it refuses", () => {
  it("refuses internal and non-public targets", () => {
    // TODO: localhost, 127.0.0.1, 169.254.169.254, 10.x, 192.168.x, [::1], *.local, *.internal
  });

  it("refuses hostnames with a port, credentials, or whitespace", () => {
    // TODO
  });

  it("normalises a pasted URL down to its hostname", () => {
    // TODO: documented behaviour — only the host is requested
  });

  it("normalises BEFORE any limiter sees the value", () => {
    // TODO: garbage must not mint rate-limit keys
  });
});

describe("limits", () => {
  it("limits per visitor and returns 429 with Retry-After", () => {
    // TODO
  });

  it("limits per target across all visitors", () => {
    // TODO
  });

  it("applies a global ceiling", () => {
    // TODO
  });

  it("serves a repeat from cache within 15 minutes without a second fetch", () => {
    // TODO: and the cache is bounded
  });

  it("caps checks in flight", () => {
    // TODO: busy 429 once MAX_IN_FLIGHT are running
  });

  it("shares one bucket per IP when no client IP is known", () => {
    // TODO: document that this is the safe failure
  });
});

describe("audit", () => {
  it("records requested, completed and failed with no actor and anonymous:true", () => {
    // TODO
  });
});
