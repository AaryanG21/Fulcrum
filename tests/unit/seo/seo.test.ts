import { describe, it } from "vitest";

/**
 * SCAFFOLD ONLY — assertions are hand-written by the project author.
 *
 * Covers src/lib/seo.ts, app/robots.ts, app/sitemap.ts and the X-Robots-Tag
 * header set in proxy.ts. The rule: the site is noindex by default and only
 * a short list opts back in.
 */

describe("INDEXABLE_PATHS and isNoIndexPath", () => {
  it("never overlaps: no indexable path is a noindex path", () => {
    // TODO
  });

  it("treats a prefix as the path and its children, not as a string prefix", () => {
    // TODO: "/scans" and "/scans/x" match; "/scansfoo" does not
  });

  it("covers every authenticated area and every secret-URL area", () => {
    // TODO: /dashboard /admin /account /scans /enroll /r /api and the email-link pages
  });
});

describe("sitemap", () => {
  it("lists exactly INDEXABLE_PATHS, as absolute URLs on APP_ORIGIN", () => {
    // TODO
  });

  it("lists nothing behind a login", () => {
    // TODO
  });

  it("gives lastModified only to the legal pages", () => {
    // TODO: never a made-up or per-request date
  });
});

describe("robots", () => {
  it("disallows /api/ and /r/ and points at the sitemap", () => {
    // TODO
  });

  it("does NOT disallow the noindex pages", () => {
    // TODO: a crawler forbidden to fetch a page can never read its noindex
  });
});

describe("X-Robots-Tag", () => {
  it("is set on every noindex path and absent on every indexable one", () => {
    // TODO: via the proxy
  });
});

describe("page metadata", () => {
  it("opts each indexable page back in with a canonical URL", () => {
    // TODO
  });

  it("leaves every private page noindex", () => {
    // TODO
  });
});
