import { describe, it } from "vitest";

/**
 * SCAFFOLD ONLY — assertions are hand-written by the project author.
 *
 * Covers the confirmation gate: register, login, enrolment, 2FA verify and
 * the /email/verify and /email/resend routes.
 *
 * The rule: a SESSION IS NEVER ISSUED while emailVerifiedAt is null.
 */

describe("registration", () => {
  it("sends one confirmation email to the new address", () => {
    // TODO
  });

  it("returns the same body for a new and an already-registered address", () => {
    // TODO
  });

  it("does not require confirmation before enrolling the authenticator", () => {
    // TODO: the mfa-pending cookie still lets setup/activate run
  });
});

describe("login", () => {
  it("returns email_unverified for a CORRECT password on an unconfirmed address", () => {
    // TODO: and issues no mfa_pending cookie
  });

  it("returns the generic failure for a WRONG password on an unconfirmed address", () => {
    // TODO: the specific status must only be reachable with the right password
  });

  it("writes LOGIN_BLOCKED_UNVERIFIED_EMAIL", () => {
    // TODO
  });
});

describe("2FA enrolment", () => {
  it("completes enrolment for an unconfirmed address but issues NO session", () => {
    // TODO: signedIn false, emailVerificationRequired true, no fulcrum_at
  });

  it("does issue a session once the address is confirmed", () => {
    // TODO
  });
});

describe("2FA verify (defence in depth)", () => {
  it("refuses an unconfirmed address even with a valid pending token", () => {
    // TODO: unreachable through login, but createSession's caller must hold the line
  });
});

describe("POST /api/auth/email/verify", () => {
  it("confirms the address and does NOT sign anyone in", () => {
    // TODO
  });

  it("rejects an unknown, expired or already-used token", () => {
    // TODO
  });

  it("is a POST, so a link previewer fetching the URL cannot spend it", () => {
    // TODO: GET on the API route is not allowed
  });
});

describe("POST /api/auth/email/resend", () => {
  it("answers identically whether or not the address exists or is confirmed", () => {
    // TODO
  });

  it("only sends to an existing, unconfirmed, non-suspended account", () => {
    // TODO
  });
});

describe("migration back-fill", () => {
  it("treats accounts that existed before confirmation as confirmed", () => {
    // TODO: otherwise every existing user, including the operator, is locked out
  });
});
