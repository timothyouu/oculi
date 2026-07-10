import { describe, expect, it } from "vitest";
import { createInitialDemoState } from "./storage";
import { mergeDemoStates } from "./state-merge";
import type { DemoState } from "./types";

function baseState(overrides: Partial<DemoState> = {}): DemoState {
  return {
    ...createInitialDemoState(),
    savedPlaceIds: [],
    followedUserIds: [],
    uploadedPhotos: [],
    ...overrides,
  };
}

describe("mergeDemoStates", () => {
  it("unions savedPlaceIds/likedPhotoIds/viewedPhotoIds without duplicates", () => {
    const a = baseState({
      savedPlaceIds: ["coit-tower", "grace-cathedral"],
      likedPhotoIds: ["photo-1"],
      viewedPhotoIds: ["photo-1", "photo-2"],
    });
    const b = baseState({
      savedPlaceIds: ["grace-cathedral", "twin-peaks"],
      likedPhotoIds: ["photo-1", "photo-3"],
      viewedPhotoIds: ["photo-2", "photo-4"],
    });

    const merged = mergeDemoStates(a, b);

    expect(merged.savedPlaceIds).toEqual(["coit-tower", "grace-cathedral", "twin-peaks"]);
    expect(merged.likedPhotoIds).toEqual(["photo-1", "photo-3"]);
    expect(merged.viewedPhotoIds).toEqual(["photo-1", "photo-2", "photo-4"]);
  });

  it("unions followedUserIds and viewedPlaceIds", () => {
    const a = baseState({ followedUserIds: ["user-maya"], viewedPlaceIds: ["coit-tower"] });
    const b = baseState({ followedUserIds: ["user-eli"], viewedPlaceIds: ["coit-tower", "twin-peaks"] });

    const merged = mergeDemoStates(a, b);

    expect(merged.followedUserIds).toEqual(["user-maya", "user-eli"]);
    expect(merged.viewedPlaceIds).toEqual(["coit-tower", "twin-peaks"]);
  });

  it("merges placeViews per place, taking the later viewedAt and the max viewCount", () => {
    const a = baseState({
      placeViews: [{ placeId: "coit-tower", viewedAt: "2026-07-01T00:00:00.000Z", viewCount: 3 }],
    });
    const b = baseState({
      placeViews: [{ placeId: "coit-tower", viewedAt: "2026-07-05T00:00:00.000Z", viewCount: 1 }],
    });

    const merged = mergeDemoStates(a, b);

    expect(merged.placeViews).toEqual([
      { placeId: "coit-tower", viewedAt: "2026-07-05T00:00:00.000Z", viewCount: 3 },
    ]);
  });

  it("keeps placeViews unique to either side", () => {
    const a = baseState({
      placeViews: [{ placeId: "coit-tower", viewedAt: "2026-07-01T00:00:00.000Z", viewCount: 1 }],
    });
    const b = baseState({
      placeViews: [{ placeId: "twin-peaks", viewedAt: "2026-07-02T00:00:00.000Z", viewCount: 1 }],
    });

    const merged = mergeDemoStates(a, b);

    expect(merged.placeViews.map((view) => view.placeId).sort()).toEqual(["coit-tower", "twin-peaks"]);
  });

  it("prefers scalar fields (lastDiscoveryPlaceId, discoveryActiveIndex) from the state with more recent activity", () => {
    const older = baseState({
      placeViews: [{ placeId: "coit-tower", viewedAt: "2026-07-01T00:00:00.000Z", viewCount: 1 }],
      lastDiscoveryPlaceId: "coit-tower",
      lastViewedPlaceId: "coit-tower",
      discoveryActiveIndex: 2,
    });
    const newer = baseState({
      placeViews: [{ placeId: "twin-peaks", viewedAt: "2026-07-09T00:00:00.000Z", viewCount: 1 }],
      lastDiscoveryPlaceId: "twin-peaks",
      lastViewedPlaceId: "twin-peaks",
      discoveryActiveIndex: 5,
    });

    const merged = mergeDemoStates(older, newer);

    expect(merged.lastDiscoveryPlaceId).toBe("twin-peaks");
    expect(merged.lastViewedPlaceId).toBe("twin-peaks");
    expect(merged.discoveryActiveIndex).toBe(5);

    // Order shouldn't matter.
    const mergedReversed = mergeDemoStates(newer, older);
    expect(mergedReversed.lastDiscoveryPlaceId).toBe("twin-peaks");
    expect(mergedReversed.discoveryActiveIndex).toBe(5);
  });

  it("falls back to the older state's scalar fields when the newer state doesn't have them set", () => {
    const older = baseState({
      placeViews: [{ placeId: "coit-tower", viewedAt: "2026-07-01T00:00:00.000Z", viewCount: 1 }],
      lastDiscoveryPlaceId: "coit-tower",
    });
    const newer = baseState({
      placeViews: [{ placeId: "twin-peaks", viewedAt: "2026-07-09T00:00:00.000Z", viewCount: 1 }],
      lastDiscoveryPlaceId: undefined,
    });

    const merged = mergeDemoStates(older, newer);

    expect(merged.lastDiscoveryPlaceId).toBe("coit-tower");
  });

  it("merges uploadedPhotos by id, deduplicating and sorting newest first", () => {
    const a = baseState({
      uploadedPhotos: [
        { id: "upload-1", placeId: "coit-tower", userId: "u", imageUrl: "x", caption: "a", locationLabel: "l", tags: [], createdAt: "2026-07-01T00:00:00.000Z", likeCount: 0 },
      ],
    });
    const b = baseState({
      uploadedPhotos: [
        { id: "upload-1", placeId: "coit-tower", userId: "u", imageUrl: "x", caption: "a", locationLabel: "l", tags: [], createdAt: "2026-07-01T00:00:00.000Z", likeCount: 0 },
        { id: "upload-2", placeId: "twin-peaks", userId: "u", imageUrl: "y", caption: "b", locationLabel: "l", tags: [], createdAt: "2026-07-08T00:00:00.000Z", likeCount: 0 },
      ],
    });

    const merged = mergeDemoStates(a, b);

    expect(merged.uploadedPhotos.map((photo) => photo.id)).toEqual(["upload-2", "upload-1"]);
  });

  it("takes profile from the state with more recent activity", () => {
    const older = baseState({
      placeViews: [{ placeId: "coit-tower", viewedAt: "2026-07-01T00:00:00.000Z", viewCount: 1 }],
      profile: { name: "Old Name", username: "@old", avatarUrl: "a", bio: "old bio", homeArea: "SF", favoriteTags: [] },
    });
    const newer = baseState({
      placeViews: [{ placeId: "twin-peaks", viewedAt: "2026-07-09T00:00:00.000Z", viewCount: 1 }],
      profile: { name: "New Name", username: "@new", avatarUrl: "b", bio: "new bio", homeArea: "SF", favoriteTags: [] },
    });

    const merged = mergeDemoStates(older, newer);

    expect(merged.profile.name).toBe("New Name");
  });

  it("reproduces the visitor-migration scenario: an old localStorage save survives merge into a fresh auth-keyed state", () => {
    const legacyLocalState = baseState({ savedPlaceIds: ["marshall-beach"] });
    const freshAuthState = createInitialDemoState();
    // A brand-new anonymous session's remote row starts from the seed
    // initial state, which does NOT include "marshall-beach".
    expect(freshAuthState.savedPlaceIds).not.toContain("marshall-beach");

    const merged = mergeDemoStates(legacyLocalState, freshAuthState);

    expect(merged.savedPlaceIds).toContain("marshall-beach");
  });
});
