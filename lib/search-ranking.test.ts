import { describe, expect, it } from "vitest";
import { currentUserId, places, users } from "./data";
import { rankSearchResults } from "./search-ranking";

const placeFields = [
  { weight: 5, getValue: (place: (typeof places)[number]) => [place.name] },
  { weight: 3, getValue: (place: (typeof places)[number]) => [place.fuzzyLocationLabel] },
  { weight: 2.5, getValue: (place: (typeof places)[number]) => [place.tags, place.bestTimes] },
  { weight: 1, getValue: (place: (typeof places)[number]) => [place.description] },
];

const profileFields = [
  { weight: 5, getValue: (user: (typeof users)[number]) => [user.name, user.username] },
  { weight: 2, getValue: (user: (typeof users)[number]) => [user.homeArea] },
  { weight: 1, getValue: (user: (typeof users)[number]) => [user.bio] },
];

describe("rankSearchResults", () => {
  it("prioritizes exact and prefix place-name matches over loose tag matches", () => {
    const results = rankSearchResults({ items: places, query: "baker", fields: placeFields, limit: 4 });

    expect(results[0]?.id).toBe("baker-beach");
    expect(results.map((place) => place.id)).not.toContain("golden-gate-overlook");
  });

  it("finds handles and names before weaker profile bio matches", () => {
    const results = rankSearchResults({
      items: users.filter((user) => user.id !== currentUserId),
      query: "@maya",
      fields: profileFields,
      limit: 4,
    });

    expect(results[0]?.id).toBe("user-maya");
  });

  it("does not return unrelated results for short queries without a primary prefix match", () => {
    const results = rankSearchResults({ items: places, query: "x", fields: placeFields, limit: 4 });

    expect(results).toHaveLength(0);
  });

  it("tolerates close typos when the intended result is obvious", () => {
    const results = rankSearchResults({ items: places, query: "bakr bech", fields: placeFields, limit: 4 });

    expect(results[0]?.id).toBe("baker-beach");
  });
});
