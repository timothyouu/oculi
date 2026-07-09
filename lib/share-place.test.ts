import { describe, expect, it } from "vitest";
import { buildPlaceShareUrl } from "./share-place";
import type { Place } from "./types";

const basePlace: Place = {
  id: "golden-gate-bridge",
  areaId: "sf",
  name: "Golden Gate Bridge",
  description: "An iconic suspension bridge.",
  lat: 37.8199,
  lng: -122.4783,
  fuzzyLocationLabel: "San Francisco, CA",
  timCurated: true,
  saveCount: 42,
  recentActivityScore: 1,
  bestTimes: ["sunset"],
  tags: ["landmark"],
  coverPhotoUrl: "https://example.com/photo.jpg",
};

describe("buildPlaceShareUrl", () => {
  it("builds a /places/[placeId] URL from the given origin", () => {
    expect(buildPlaceShareUrl(basePlace, "https://oculi.app")).toBe(
      "https://oculi.app/places/golden-gate-bridge",
    );
  });
});
