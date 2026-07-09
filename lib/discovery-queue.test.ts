import { describe, expect, it } from "vitest";
import { buildResumableQueue } from "./discovery-queue";

describe("buildResumableQueue", () => {
  it("excludes already-viewed photos", () => {
    const queue = buildResumableQueue(["a", "b", "c"], ["b"], undefined);
    expect(queue).toEqual(["a", "c"]);
  });

  it("keeps the resume anchor in the queue even though it was already viewed", () => {
    // Reproduces the reported bug: landing on a photo records it as viewed, so on the
    // next visit a naive "unseen only" filter drops the resume anchor entirely and the
    // deck opens on a different, shifted-index photo instead of where the user left off.
    const queue = buildResumableQueue(["a", "b", "c"], ["a", "b"], "b");
    expect(queue).toEqual(["b", "c"]);
  });

  it("preserves original order, including the reinstated resume anchor", () => {
    const queue = buildResumableQueue(["a", "b", "c", "d"], ["a", "c"], "c");
    expect(queue).toEqual(["b", "c", "d"]);
  });
});
