import { describe, expect, it } from "vitest";
import { overlayFollowerCounts, overlayLikeCounts, overlaySaveCounts, resolveCatalogKind } from "./catalog-hydration";

describe("resolveCatalogKind", () => {
  const seed = ["seed-a", "seed-b"];

  it("falls back to seed when the fetch errored", () => {
    expect(resolveCatalogKind(seed, { items: [], error: true })).toEqual(seed);
    expect(resolveCatalogKind(seed, { items: ["remote-a"], error: true })).toEqual(seed);
  });

  it("falls back to seed on an empty-but-successful fetch when the seed is non-empty", () => {
    expect(resolveCatalogKind(seed, { items: [], error: false })).toEqual(seed);
  });

  it("uses the remote rows outright (no merge) when the fetch returns non-empty rows", () => {
    const remote = ["remote-a", "remote-b", "remote-c"];
    expect(resolveCatalogKind(seed, { items: remote, error: false })).toEqual(remote);
  });

  it("does not fall back when both seed and remote are legitimately empty", () => {
    expect(resolveCatalogKind<string>([], { items: [], error: false })).toEqual([]);
  });
});

describe("overlaySaveCounts", () => {
  it("replaces saveCount with the real count, defaulting to 0", () => {
    const places = [
      { id: "a", saveCount: 641 },
      { id: "b", saveCount: 0 },
    ];
    const result = overlaySaveCounts(places, { a: 3 });
    expect(result).toEqual([
      { id: "a", saveCount: 3 },
      { id: "b", saveCount: 0 },
    ]);
  });
});

describe("overlayFollowerCounts", () => {
  it("replaces followerCount with the real count, defaulting to 0", () => {
    const users = [{ id: "user-maya", followerCount: 1510 }];
    expect(overlayFollowerCounts(users, {})).toEqual([{ id: "user-maya", followerCount: 0 }]);
    expect(overlayFollowerCounts(users, { "user-maya": 2 })).toEqual([{ id: "user-maya", followerCount: 2 }]);
  });
});

describe("overlayLikeCounts", () => {
  it("replaces likeCount with the real count, defaulting to 0", () => {
    const photos = [{ id: "photo-1", likeCount: 72 }];
    expect(overlayLikeCounts(photos, {})).toEqual([{ id: "photo-1", likeCount: 0 }]);
    expect(overlayLikeCounts(photos, { "photo-1": 5 })).toEqual([{ id: "photo-1", likeCount: 5 }]);
  });
});
