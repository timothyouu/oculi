import { describe, expect, it } from "vitest";
import { buildCluster, buildPlacePhotoNodes, nodeScore } from "./map-clusters";
import type { Photo, Place } from "./types";

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

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: "photo-test",
    placeId: "place-test",
    userId: "user-test",
    imageUrl: "/photo.jpg",
    caption: "",
    locationLabel: "",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    likeCount: 0,
    ...overrides,
  };
}

describe("nodeScore", () => {
  it("is dominated by photoCount regardless of saveCount", () => {
    const morePhotosNoSaves = nodeScore(makePlace({ saveCount: 0 }), 5);
    const fewerPhotosManySaves = nodeScore(makePlace({ saveCount: 500 }), 1);

    expect(morePhotosNoSaves).toBeGreaterThan(fewerPhotosManySaves);
  });

  it("gives a small, non-zero boost to a place with a few real saves over an otherwise-identical zero-save place", () => {
    const withSaves = nodeScore(makePlace({ saveCount: 3, recentActivityScore: 70 }), 2);
    const withoutSaves = nodeScore(makePlace({ saveCount: 0, recentActivityScore: 70 }), 2);

    expect(withSaves).toBeGreaterThan(withoutSaves);
    // The boost should be meaningful but small next to recentActivityScore's own range.
    expect(withSaves - withoutSaves).toBeLessThan(40);
  });
});

describe("buildCluster primary place selection", () => {
  it("picks a sane primary (most photos) when every place in the group has zero saves", () => {
    const busiest = makePlace({ id: "busiest", name: "Busiest Overlook", recentActivityScore: 70, saveCount: 0 });
    const quiet = makePlace({ id: "quiet", name: "Quiet Overlook", recentActivityScore: 70, saveCount: 0 });
    const nodes = buildPlacePhotoNodes(
      [busiest, quiet],
      [makePhoto({ id: "p1", placeId: "busiest" }), makePhoto({ id: "p2", placeId: "busiest" }), makePhoto({ id: "p3", placeId: "quiet" })],
    );

    const cluster = buildCluster("group", nodes);

    expect(cluster.primaryPlace.id).toBe("busiest");
  });

  it("lets a place with a few real saves become primary over an all-zero peer with the same photo count and activity", () => {
    const saved = makePlace({ id: "saved", name: "Saved Overlook", recentActivityScore: 70, saveCount: 4 });
    const unsaved = makePlace({ id: "unsaved", name: "Unsaved Overlook", recentActivityScore: 70, saveCount: 0 });
    const nodes = buildPlacePhotoNodes(
      [unsaved, saved],
      [makePhoto({ id: "p1", placeId: "saved" }), makePhoto({ id: "p2", placeId: "unsaved" })],
    );

    const cluster = buildCluster("group", nodes);

    expect(cluster.primaryPlace.id).toBe("saved");
  });
});
