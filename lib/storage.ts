import { currentUserId } from "./data";
import type { DemoState } from "./types";

export const DEMO_STATE_STORAGE_KEY = "oculi:demo-state";
export const DEMO_VISITOR_ID_STORAGE_KEY = "oculi:visitor-id";
export const MAP_SELECTED_PLACE_STORAGE_KEY = "oculi:map-selected-place-id";
export const MAP_CAMERA_STORAGE_KEY = "oculi:map-camera";
export const MAP_DETAIL_LEVEL_STORAGE_KEY = "oculi:map-detail-level";

// The four places every fresh demo visitor USED to start with saved
// (removed 2026-07-11: new accounts/guests now start with nothing saved and
// no posts). The list must stay: `lib/state-merge.ts`
// `selectSavedPlaceIdsToMigrate` still uses it to stop these ids -- present
// in RETURNING visitors' pre-change localStorage blobs as unearned demo
// flavor -- from ever being written into the remote `saved_places` table
// (and inflating public save counts) unless a durable source proves a real
// save.
export const DEFAULT_SAVED_PLACE_IDS: readonly string[] = [
  "coit-tower",
  "grace-cathedral",
  "mission-murals",
  "golden-gate-overlook",
];

export const initialDemoState: DemoState = {
  savedPlaceIds: [],
  itineraryPlaceIds: [],
  followedUserIds: ["user-maya", "user-eli"],
  likedPhotoIds: [],
  viewedPhotoIds: [],
  viewedPlaceIds: [],
  placeViews: [],
  lastViewedPlaceId: undefined,
  lastDiscoveryPlaceId: undefined,
  discoveryActiveIndex: 0,
  uploadedPhotos: [],
  profile: {
    name: "John Doe",
    username: "@john.doe",
    avatarUrl: "/generated/default-avatar.svg",
    bio: "Guest photographer collecting public photo spots around the city.",
    homeArea: "San Francisco",
    favoriteTags: ["fog", "bridge", "portraits", "golden hour"],
  },
};

export function createInitialDemoState(): DemoState {
  return {
    savedPlaceIds: [...initialDemoState.savedPlaceIds],
    itineraryPlaceIds: [...initialDemoState.itineraryPlaceIds],
    followedUserIds: [...initialDemoState.followedUserIds],
    likedPhotoIds: [],
    viewedPhotoIds: [],
    viewedPlaceIds: [],
    placeViews: [],
    lastViewedPlaceId: undefined,
    lastDiscoveryPlaceId: undefined,
    discoveryActiveIndex: 0,
    uploadedPhotos: [],
    profile: {
      ...initialDemoState.profile,
      favoriteTags: [...initialDemoState.profile.favoriteTags],
    },
  };
}

export function normalizeDemoState(state?: Partial<DemoState> | null): DemoState {
  const initial = createInitialDemoState();
  // Pre-2026-07-11 blobs seeded five fake "starter-upload-*" posts and the
  // four DEFAULT_SAVED_PLACE_IDS as demo flavor. Fresh accounts now start
  // empty, and returning visitors get the flavor scrubbed here so every page
  // (profile counts, saved list, galleries) aligns with the database:
  // - starter uploads were never user-created and exist nowhere durable, so
  //   dropping them is lossless (real uploads have "upload-*" ids and live in
  //   public.photos);
  // - a default place the user REALLY saved comes back from its owner-scoped
  //   `saved_places` row when bootstrap unions remote relations, so stripping
  //   the id locally only removes the unearned copy.
  const uploadedPhotos = (Array.isArray(state?.uploadedPhotos)
    ? state.uploadedPhotos
    : initial.uploadedPhotos
  ).filter((photo) => !photo.id.startsWith("starter-upload-"));

  return {
    ...initial,
    ...(state ?? {}),
    savedPlaceIds: Array.isArray(state?.savedPlaceIds)
      ? Array.from(new Set(state.savedPlaceIds)).filter((id) => !DEFAULT_SAVED_PLACE_IDS.includes(id))
      : initial.savedPlaceIds,
    itineraryPlaceIds: Array.isArray(state?.itineraryPlaceIds)
      ? Array.from(new Set(state.itineraryPlaceIds))
      : initial.itineraryPlaceIds,
    followedUserIds: state?.followedUserIds ?? initial.followedUserIds,
    likedPhotoIds: state?.likedPhotoIds ?? initial.likedPhotoIds,
    viewedPhotoIds: state?.viewedPhotoIds ?? initial.viewedPhotoIds,
    viewedPlaceIds: state?.viewedPlaceIds ?? initial.viewedPlaceIds,
    placeViews: state?.placeViews ?? initial.placeViews,
    discoveryActiveIndex: state?.discoveryActiveIndex ?? initial.discoveryActiveIndex,
    uploadedPhotos,
    profile: {
      ...initial.profile,
      ...(state?.profile ?? {}),
      favoriteTags: state?.profile?.favoriteTags?.length
        ? Array.from(new Set(state.profile.favoriteTags.map((tag) => tag.toLowerCase())))
        : initial.profile.favoriteTags,
    },
  };
}

export function loadLocalDemoState(): DemoState {
  if (typeof window === "undefined") return createInitialDemoState();

  try {
    const stored = window.localStorage.getItem(DEMO_STATE_STORAGE_KEY);
    return normalizeDemoState(stored ? JSON.parse(stored) : null);
  } catch {
    return createInitialDemoState();
  }
}

export function saveLocalDemoState(state: DemoState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(DEMO_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Demo state should still work in-memory when storage is unavailable.
  }
}

export function resetLocalDemoState() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(DEMO_STATE_STORAGE_KEY);
  } catch {
    // Ignore local reset failures; the in-memory reset still applies.
  }
}

export function loadMapSelectedPlaceId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(MAP_SELECTED_PLACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveMapSelectedPlaceId(placeId: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(MAP_SELECTED_PLACE_STORAGE_KEY, placeId);
  } catch {
    // The map still works with in-memory selection when storage is unavailable.
  }
}

export function clearMapSelectedPlaceId() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(MAP_SELECTED_PLACE_STORAGE_KEY);
  } catch {
    // Ignore; nothing persisted to clear.
  }
}

export type MapCameraView = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

function isMapCameraView(value: unknown): value is MapCameraView {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MapCameraView>;

  return (
    Array.isArray(candidate.center) &&
    candidate.center.length === 2 &&
    candidate.center.every((coordinate) => typeof coordinate === "number") &&
    typeof candidate.zoom === "number" &&
    typeof candidate.bearing === "number" &&
    typeof candidate.pitch === "number"
  );
}

export function loadMapCameraView(): MapCameraView | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(MAP_CAMERA_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return isMapCameraView(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveMapCameraView(view: MapCameraView) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(MAP_CAMERA_STORAGE_KEY, JSON.stringify(view));
  } catch {
    // The map still works with an in-memory camera position when storage is unavailable.
  }
}

// The stylized (no-token) map fallback has no real camera, only a cluster
// "detail level" stepper - persist that instead so it still reopens at
// roughly the same zoom, matching the live map's camera restore.
export function loadMapDetailLevel(): number | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(MAP_DETAIL_LEVEL_STORAGE_KEY);
    if (stored === null) return null;

    const parsed = Number(stored);
    return Number.isInteger(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveMapDetailLevel(level: number) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(MAP_DETAIL_LEVEL_STORAGE_KEY, String(level));
  } catch {
    // The map still works with an in-memory detail level when storage is unavailable.
  }
}

export function getDemoVisitorId(): string {
  if (typeof window === "undefined") return currentUserId;

  try {
    const stored = window.localStorage.getItem(DEMO_VISITOR_ID_STORAGE_KEY);
    if (stored) return stored;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `visitor-${crypto.randomUUID()}`
        : `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(DEMO_VISITOR_ID_STORAGE_KEY, id);
    return id;
  } catch {
    return currentUserId;
  }
}
