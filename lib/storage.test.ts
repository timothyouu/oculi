import { beforeEach, describe, expect, it } from "vitest";
import {
  clearMapSelectedPlaceId,
  createInitialDemoState,
  loadMapCameraView,
  loadMapDetailLevel,
  loadMapSelectedPlaceId,
  DEFAULT_SAVED_PLACE_IDS,
  normalizeDemoState,
  saveMapCameraView,
  saveMapDetailLevel,
  saveMapSelectedPlaceId,
} from "./storage";
import type { Photo } from "./types";

function photoWithId(id: string): Photo {
  return {
    id,
    placeId: "baker-beach",
    userId: "u",
    imageUrl: "https://example.com/x.jpg",
    caption: "c",
    locationLabel: "l",
    tags: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    likeCount: 0,
  };
}

describe("normalizeDemoState", () => {
  it("starts a brand-new account/guest with no saved places and no posts", () => {
    const normalized = normalizeDemoState(null);
    const initial = createInitialDemoState();

    expect(normalized.savedPlaceIds).toEqual([]);
    expect(normalized.uploadedPhotos).toEqual([]);
    expect(initial.savedPlaceIds).toEqual([]);
    expect(initial.uploadedPhotos).toEqual([]);
  });

  it("preserves real persisted saved places, deduplicated", () => {
    const normalized = normalizeDemoState({
      savedPlaceIds: ["baker-beach", "baker-beach", "twin-peaks"],
      uploadedPhotos: [],
    });

    expect(normalized.savedPlaceIds).toEqual(["baker-beach", "twin-peaks"]);
  });

  it("scrubs legacy demo-flavor default saves from a pre-change blob, keeping real saves", () => {
    const normalized = normalizeDemoState({
      savedPlaceIds: [...DEFAULT_SAVED_PLACE_IDS, "twin-peaks"],
      uploadedPhotos: [],
    });

    expect(normalized.savedPlaceIds).toEqual(["twin-peaks"]);
  });

  it("scrubs legacy starter-upload posts from a pre-change blob, keeping real uploads", () => {
    const normalized = normalizeDemoState({
      savedPlaceIds: [],
      uploadedPhotos: [photoWithId("starter-upload-baker-beach"), photoWithId("upload-abc123")],
    });

    expect(normalized.uploadedPhotos.map((photo) => photo.id)).toEqual(["upload-abc123"]);
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

describe("map camera persistence", () => {
  beforeEach(() => {
    globalThis.window = { localStorage: createMemoryLocalStorage() } as unknown as Window & typeof globalThis;
  });

  it("returns null when nothing has been persisted", () => {
    expect(loadMapCameraView()).toBeNull();
  });

  it("round-trips a saved camera view", () => {
    const view = { center: [-122.4194, 37.7749] as [number, number], zoom: 13.5, bearing: 12, pitch: 0 };
    saveMapCameraView(view);
    expect(loadMapCameraView()).toEqual(view);
  });

  it("ignores malformed stored data instead of throwing", () => {
    window.localStorage.setItem("oculi:map-camera", JSON.stringify({ zoom: 13.5 }));
    expect(loadMapCameraView()).toBeNull();
  });
});

describe("map detail level persistence", () => {
  beforeEach(() => {
    globalThis.window = { localStorage: createMemoryLocalStorage() } as unknown as Window & typeof globalThis;
  });

  it("returns null when nothing has been persisted", () => {
    expect(loadMapDetailLevel()).toBeNull();
  });

  it("round-trips a saved detail level", () => {
    saveMapDetailLevel(2);
    expect(loadMapDetailLevel()).toBe(2);
  });
});
