import { describe, expect, it } from "vitest";
import { accessibilityForPlace } from "./place-accessibility";
import type { Place } from "./types";

// Built without sceneTypes/easeOfVisit/bestLight on purpose: the accessibilityForPlace
// derivation is the fallback for places that predate those curated fields, and these tests
// exercise that fallback. Field-first behavior is covered by its own test below.
function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: "place-test",
    areaId: "area-test",
    name: "Test Overlook",
    description: "A calm spot.",
    lat: 0,
    lng: 0,
    fuzzyLocationLabel: "Somewhere",
    timCurated: false,
    saveCount: 0,
    recentActivityScore: 0,
    bestTimes: [],
    tags: [],
    coverPhotoUrl: "/cover.jpg",
    ...overrides,
  } as Place;
}

describe("accessibilityForPlace", () => {
  it("uses the curated easeOfVisit field when present, ignoring the derivation heuristics", () => {
    // Tags would derive "Difficult", but the curated field wins.
    expect(accessibilityForPlace(makePlace({ tags: ["trail"], easeOfVisit: "Easy" }))).toBe("Easy");
    expect(accessibilityForPlace(makePlace({ tags: ["park"], easeOfVisit: "Moderate" }))).toBe("Moderate");
  });

  it("returns Difficult when a hard-to-reach term appears in any field", () => {
    expect(accessibilityForPlace(makePlace({ tags: ["trail"] }))).toBe("Difficult");
    expect(accessibilityForPlace(makePlace({ bestTimes: ["night"] }))).toBe("Difficult");
    expect(accessibilityForPlace(makePlace({ description: "Best at low tide over the ruins." }))).toBe("Difficult");
  });

  it("returns Moderate for coastal/elevated spots without difficult terms", () => {
    expect(accessibilityForPlace(makePlace({ tags: ["coast"] }))).toBe("Moderate");
    expect(accessibilityForPlace(makePlace({ tags: ["skyline", "bridge"] }))).toBe("Moderate");
  });

  it("prioritizes Difficult over Moderate when both kinds of terms are present", () => {
    expect(accessibilityForPlace(makePlace({ tags: ["coast"], bestTimes: ["night"] }))).toBe("Difficult");
  });

  it("defaults to Easy for ordinary places", () => {
    expect(accessibilityForPlace(makePlace({ tags: ["park", "portraits"] }))).toBe("Easy");
  });
});
