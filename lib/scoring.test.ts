import { describe, expect, it } from "vitest";
import {
  compareTopPlaces,
  isHighlySaved,
  saveCountBoost,
  sortTopPlaces,
  topPlaceScore,
  topTierReason,
} from "./scoring";
import type { Place } from "./types";

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
    recentActivityScore: 70,
    bestTimes: [],
    tags: [],
    sceneTypes: ["landscape"],
    easeOfVisit: "Easy",
    bestLight: ["blue-hour"],
    coverPhotoUrl: "/cover.jpg",
    ...overrides,
  };
}

describe("saveCountBoost", () => {
  it("is zero for zero saves, so an all-zero catalog contributes nothing extra", () => {
    expect(saveCountBoost(0)).toBe(0);
  });

  it("grows with saves but flattens out (log-scaled), not linear", () => {
    const one = saveCountBoost(1);
    const two = saveCountBoost(2);
    const ten = saveCountBoost(10);

    expect(one).toBeGreaterThan(0);
    // Doubling from 1 to 2 saves should add less than doubling the boost.
    expect(two).toBeLessThan(one * 2);
    // Going from 2 to 10 saves (a 5x increase) should not multiply the boost 5x.
    expect(ten).toBeLessThan(two * 5);
  });
});

describe("topPlaceScore / compareTopPlaces", () => {
  it("still puts curated places first regardless of saveCount or recentActivityScore", () => {
    const curated = makePlace({ id: "curated", timCurated: true, recentActivityScore: 10, saveCount: 0 });
    const notCurated = makePlace({ id: "not-curated", timCurated: false, recentActivityScore: 99, saveCount: 50 });

    expect(compareTopPlaces(curated, notCurated)).toBeLessThan(0);
  });

  it("does not let a single real save leapfrog a much higher recentActivityScore place", () => {
    // Regression: the old `saveCount * 100` weight meant one save (100 points) could
    // outrank a ~40-point recentActivityScore gap outright. With real saveCount starting
    // at 0, that let one accidental save crush the recency/curation signal entirely.
    const oneSaveLowActivity = makePlace({ id: "low-activity-one-save", recentActivityScore: 56, saveCount: 1 });
    const noSaveHighActivity = makePlace({ id: "high-activity-no-saves", recentActivityScore: 95, saveCount: 0 });

    expect(compareTopPlaces(oneSaveLowActivity, noSaveHighActivity)).toBeGreaterThan(0);
    expect(sortTopPlaces([oneSaveLowActivity, noSaveHighActivity])[0].id).toBe("high-activity-no-saves");
  });

  it("still lets saveCount break a genuine near-tie in recentActivityScore", () => {
    const withSaves = makePlace({ id: "with-saves", recentActivityScore: 80, saveCount: 4 });
    const withoutSaves = makePlace({ id: "without-saves", recentActivityScore: 80, saveCount: 0 });

    expect(topPlaceScore(withSaves)).toBeGreaterThan(topPlaceScore(withoutSaves));
    expect(sortTopPlaces([withoutSaves, withSaves])[0].id).toBe("with-saves");
  });
});

describe("isHighlySaved / topTierReason", () => {
  it("awards no badge across an all-zero catalog (the old >650 cutoff is now unreachable, not vacuously true)", () => {
    const places = Array.from({ length: 12 }, (_, index) => makePlace({ id: `place-${index}`, saveCount: 0 }));

    for (const place of places) {
      expect(isHighlySaved(place, places)).toBe(false);
      expect(topTierReason(place, places)).toBe("Recently active");
    }
  });

  it("fires for a place with a few real saves standing out among all-zero peers", () => {
    const standout = makePlace({ id: "standout", saveCount: 3 });
    const peers = Array.from({ length: 11 }, (_, index) => makePlace({ id: `peer-${index}`, saveCount: 0 }));
    const places = [standout, ...peers];

    expect(isHighlySaved(standout, places)).toBe(true);
    expect(topTierReason(standout, places)).toBe("Highly saved");
    // Peers stay unbadged even though the set now contains a standout.
    expect(isHighlySaved(peers[0], places)).toBe(false);
  });

  it("does not award the badge below the floor even if it would be relatively top-decile", () => {
    // A tiny catalog where the "best" saveCount is still below the floor should not badge.
    const barelyAhead = makePlace({ id: "barely-ahead", saveCount: 1 });
    const zeroSaves = makePlace({ id: "zero-saves", saveCount: 0 });

    expect(isHighlySaved(barelyAhead, [barelyAhead, zeroSaves])).toBe(false);
  });

  it("falls back to floor-only behavior when no comparison set is supplied (existing single-place callers)", () => {
    const fewSaves = makePlace({ id: "few-saves", saveCount: 3 });
    const noSaves = makePlace({ id: "no-saves", saveCount: 0 });

    expect(topTierReason(fewSaves)).toBe("Highly saved");
    expect(topTierReason(noSaves)).toBe("Recently active");
  });

  it("curated always wins over highly saved", () => {
    const curatedAndSaved = makePlace({ id: "curated-and-saved", timCurated: true, saveCount: 10 });
    expect(topTierReason(curatedAndSaved)).toBe("Curated pick");
  });
});
