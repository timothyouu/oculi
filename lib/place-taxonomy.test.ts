import { describe, expect, it } from "vitest";
import { places } from "./data";
import { accessibilityOptions } from "./place-accessibility";
import {
  LIGHT_VALUES,
  SCENE_VALUES,
  bestLightForPlace,
  matchesBestLightFilter,
  matchesSceneFilter,
  sceneLabelsFor,
  sceneTypesForPlace,
} from "./place-taxonomy";
import type { Place } from "./types";

function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: "place-test",
    areaId: "area-test",
    name: "Test",
    description: "",
    lat: 0,
    lng: 0,
    fuzzyLocationLabel: "",
    timCurated: false,
    saveCount: 0,
    recentActivityScore: 0,
    bestTimes: [],
    tags: [],
    sceneTypes: [],
    easeOfVisit: "Easy",
    bestLight: [],
    coverPhotoUrl: "/cover.jpg",
    ...overrides,
  };
}

describe("matchesSceneFilter", () => {
  it("matches when the place carries any selected scene value (empty selection matches all)", () => {
    const place = makePlace({ sceneTypes: ["bridge", "landscape"] });
    expect(matchesSceneFilter(place, [])).toBe(true);
    expect(matchesSceneFilter(place, ["bridge"])).toBe(true);
    expect(matchesSceneFilter(place, ["street", "landscape"])).toBe(true);
    expect(matchesSceneFilter(place, ["street"])).toBe(false);
  });
});

describe("matchesBestLightFilter", () => {
  it("matches only the exact light window carried by the place (Any matches all)", () => {
    const place = makePlace({ bestLight: ["Sunrise", "Golden hour"] });
    expect(matchesBestLightFilter(place, "Any")).toBe(true);
    expect(matchesBestLightFilter(place, "Sunrise")).toBe(true);
    expect(matchesBestLightFilter(place, "Night")).toBe(false);
  });
});

describe("fallbacks for places without curated fields", () => {
  it("derives scene values from tags when sceneTypes is empty", () => {
    const place = makePlace({ sceneTypes: [], tags: ["bridge", "fog", "landscape"] });
    expect(sceneTypesForPlace(place)).toEqual(["bridge", "landscape"]);
  });

  it("derives light values from bestTimes when bestLight is empty", () => {
    const place = makePlace({ bestLight: [], bestTimes: ["Sunrise", "Blue hour"] });
    const light = bestLightForPlace(place);
    expect(light).toContain("Sunrise");
    expect(light).toContain("Blue hour");
    expect(light).toContain("Golden hour"); // sunrise implies golden hour in the fallback aliases
  });
});

describe("sceneLabelsFor", () => {
  it("returns human labels in vocab order", () => {
    expect(sceneLabelsFor(makePlace({ sceneTypes: ["bridge", "skyline"] }))).toEqual([
      "Cityscape",
      "Bridge",
    ]);
  });
});

describe("catalog data integrity", () => {
  it("every place has curated taxonomy fields within the canonical vocab", () => {
    for (const place of places) {
      expect(place.sceneTypes.length, `${place.id} sceneTypes`).toBeGreaterThan(0);
      for (const value of place.sceneTypes) {
        expect(SCENE_VALUES, `${place.id} scene "${value}"`).toContain(value);
      }
      expect(place.bestLight.length, `${place.id} bestLight`).toBeGreaterThan(0);
      for (const value of place.bestLight) {
        expect(LIGHT_VALUES, `${place.id} light "${value}"`).toContain(value);
      }
      expect(accessibilityOptions, `${place.id} easeOfVisit`).toContain(place.easeOfVisit);
    }
  });
});
