import { describe, it } from "vitest";

/**
 * SCAFFOLD ONLY — assertions are hand-written by the project author.
 *
 * Covers src/lib/agent/fix-snippets.ts. These are strings people paste into
 * production server config, so the tests are about not shipping a wrong one.
 */

describe("fixGuideFor", () => {
  it("has a guide for every header check id in headers.ts", () => {
    // TODO: derive the ids from HEADER_RULES; a new rule without a guide
    // should fail here rather than ship with no help
  });

  it("maps the ':weak' variant to its base check", () => {
    // TODO
  });

  it("returns null for a CVE or fingerprint finding", () => {
    // TODO
  });

  it("recognises TLS protocol and certificate ids", () => {
    // TODO
  });
});

describe("snippet content", () => {
  it("sends every header on ALL responses, not only successes", () => {
    // TODO: nginx has `always`; Apache has `Header always`
  });

  it("carries the same header VALUE across nginx, Apache and Caddy", () => {
    // TODO: parse the value out of each and compare
  });

  it("contains nothing derived from a scan", () => {
    // TODO: it is static text keyed by checkId
  });

  it("warns before HSTS and CSP, which can break a working site", () => {
    // TODO: note is present
  });
});
