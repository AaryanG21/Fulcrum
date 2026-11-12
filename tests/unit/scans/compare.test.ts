import { describe, it } from "vitest";

/**
 * SCAFFOLD ONLY — assertions are hand-written by the project author.
 *
 * Covers src/lib/scans/compare.ts. Pure, so these need no setup: build two
 * Finding arrays and compare.
 */

describe("compareScans", () => {
  it("lists findings present now and absent before as added", () => {
    // TODO
  });

  it("lists findings present before and absent now as resolved", () => {
    // TODO
  });

  it("lists a severity change as shifted, with from and to", () => {
    // TODO: MEDIUM -> HIGH
  });

  it("counts identical findings as unchanged", () => {
    // TODO
  });

  it("matches on checkId, never on title or evidence", () => {
    // TODO: same checkId with a different title is NOT added+resolved.
    // This is the property that stops a target hiding a problem by changing a banner.
  });

  it("ignores INFO findings entirely", () => {
    // TODO
  });

  it("keeps the worse severity when a checkId appears twice", () => {
    // TODO: understating a problem is the costly error
  });

  it("sorts worst-first, then by title", () => {
    // TODO
  });

  it("handles empty inputs on either side", () => {
    // TODO
  });
});

describe("isImprovement", () => {
  it("is true only when something was resolved and nothing is new or worse", () => {
    // TODO
  });

  it("is false when a severity increased", () => {
    // TODO
  });
});
