import { describe, expect, it } from "vitest";
import { createInitialDemoState, normalizeDemoState, starterUploadedPhotos } from "./storage";

describe("normalizeDemoState", () => {
  it("uses starter saved places and uploaded photos when no persisted state exists", () => {
    const normalized = normalizeDemoState(null);
    const initial = createInitialDemoState();

    expect(normalized.savedPlaceIds).toEqual(initial.savedPlaceIds);
    expect(normalized.uploadedPhotos).toEqual(initial.uploadedPhotos);
  });

  it("respects persisted saved places instead of re-adding starter places", () => {
    const normalized = normalizeDemoState({
      savedPlaceIds: ["baker-beach", "baker-beach", "twin-peaks"],
      uploadedPhotos: [],
    });

    expect(normalized.savedPlaceIds).toEqual(["baker-beach", "twin-peaks"]);
  });

  it("respects an explicit persisted uploaded photo list", () => {
    const normalized = normalizeDemoState({
      savedPlaceIds: [],
      uploadedPhotos: [],
    });

    expect(normalized.uploadedPhotos).toEqual([]);
    expect(normalized.uploadedPhotos).not.toEqual(starterUploadedPhotos);
  });
});
