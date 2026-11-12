import { describe, it } from "vitest";

/**
 * SCAFFOLD ONLY — assertions are hand-written by the project author.
 *
 * Covers POST/DELETE /api/scans/[scanId]/share, GET .../export, and
 * /r/[token]. A share link is a bearer credential; these protect that.
 */

describe("creating a link", () => {
  it("returns the URL once and stores only its SHA-256", () => {
    // TODO: the token must not be findable in ShareLink.tokenHash
  });

  it("refuses a scan that is not COMPLETED", () => {
    // TODO
  });

  it("refuses another user's scan with the same 404 as a missing one", () => {
    // TODO
  });

  it("caps active links per scan and says why (409)", () => {
    // TODO
  });

  it("sets an expiry and writes SHARE_LINK_CREATED", () => {
    // TODO
  });
});

describe("the public report /r/[token]", () => {
  it("renders for an anonymous visitor", () => {
    // TODO
  });

  it("gives the SAME 404 for unknown, expired and revoked links", () => {
    // TODO: compare the bodies, not just the status
  });

  it("stops working immediately on revoke", () => {
    // TODO: no cache in between
  });

  it("does not show the owner's email or any other scan", () => {
    // TODO: no comparison panel, no previous-scan link
  });

  it("is noindex, no-referrer and not in robots.txt's allow list", () => {
    // TODO
  });

  it("offers no owner controls", () => {
    // TODO
  });
});

describe("revoking", () => {
  it("revokes every active link for the scan and reports how many", () => {
    // TODO
  });

  it("is owner-only", () => {
    // TODO
  });
});

describe("export", () => {
  it("returns the scan as a JSON attachment for its owner only", () => {
    // TODO
  });

  it("sanitises the hostname in the filename", () => {
    // TODO
  });
});
