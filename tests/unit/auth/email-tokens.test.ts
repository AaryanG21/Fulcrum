import { describe, it } from "vitest";

/**
 * SCAFFOLD ONLY — assertions are hand-written by the project author.
 *
 * Covers src/lib/auth/email-tokens.ts: the single-use tokens emailed for
 * address confirmation and password reset. Needs a real database — spending
 * is a conditional UPDATE, so mocking Prisma would test nothing.
 */

describe("issueAuthToken", () => {
  it("returns a plaintext token and stores only its SHA-256", () => {
    // TODO: the plaintext must not appear anywhere in the AuthToken table
  });

  it("replaces any unspent token of the same purpose", () => {
    // TODO: after a second issue, the first token no longer validates
  });

  it("does not replace a token of a DIFFERENT purpose", () => {
    // TODO: a pending reset link survives a new verification email
  });

  it("returns null when asked again inside the cooldown", () => {
    // TODO: pass an explicit `now`; a null return must mean nothing is sent
  });

  it("sets the expiry from ttlMs", () => {
    // TODO
  });
});

describe("findValidAuthToken", () => {
  it("accepts an unspent, unexpired token of the right purpose", () => {
    // TODO
  });

  it("rejects a token of the other purpose", () => {
    // TODO: a verification token must not work as a reset token
  });

  it("rejects an expired token, including exactly at expiry", () => {
    // TODO: expiresAt === now is expired
  });

  it("rejects a spent token", () => {
    // TODO
  });

  it("rejects implausible lengths without hashing them", () => {
    // TODO: < 20 and > 200 characters
  });

  it("does not spend the token", () => {
    // TODO: the reset flow depends on this — check, verify the second
    // factor, THEN spend
  });
});

describe("spendAuthToken", () => {
  it("lets exactly one of many simultaneous callers win", () => {
    // TODO: N concurrent spends of one id -> exactly one true
  });

  it("refuses a token that has expired", () => {
    // TODO
  });
});

describe("pruneExpiredAuthTokens", () => {
  it("removes tokens a week past expiry or use, and keeps newer ones", () => {
    // TODO
  });
});
