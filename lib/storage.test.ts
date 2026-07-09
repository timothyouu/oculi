import { beforeEach, describe, expect, it } from "vitest";
import {
  clearMapSelectedPlaceId,
  createInitialDemoState,
  loadMapSelectedPlaceId,
  normalizeDemoState,
  saveMapSelectedPlaceId,
  starterUploadedPhotos,
} from "./storage";

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

function createMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("map selected place persistence", () => {
  beforeEach(() => {
    // These helpers early-return when `window` is undefined, which is the
    // default (node) vitest environment for this project — stub a minimal
    // window/localStorage so the round-trip is actually exercised.
    globalThis.window = { localStorage: createMemoryLocalStorage() } as unknown as Window & typeof globalThis;
    clearMapSelectedPlaceId();
  });

  it("returns null when nothing has been persisted", () => {
    expect(loadMapSelectedPlaceId()).toBeNull();
  });

  it("round-trips a saved place id", () => {
    saveMapSelectedPlaceId("baker-beach");
    expect(loadMapSelectedPlaceId()).toBe("baker-beach");
  });

  it("clears the persisted place id when the card is explicitly closed", () => {
    saveMapSelectedPlaceId("baker-beach");
    clearMapSelectedPlaceId();
    expect(loadMapSelectedPlaceId()).toBeNull();
  });
});
