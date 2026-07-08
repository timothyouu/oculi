import { currentUserId } from "./data";
import type { DemoState, Photo } from "./types";

export const DEMO_STATE_STORAGE_KEY = "oculi:demo-state";

export const starterUploadedPhotos: Photo[] = [
  {
    id: "starter-upload-coit-tower",
    placeId: "coit-tower",
    userId: currentUserId,
    imageUrl: "/generated/coit-tower-morning.png",
    caption: "Tried the early Telegraph Hill light. Clean bay layers before the glare.",
    locationLabel: "Coit Tower / Telegraph Hill",
    metadataText: "70mm, clear morning",
    shotAtTimeOfDay: "Morning",
    tags: ["skyline", "bay", "morning"],
    createdAt: "2026-07-07T16:15:00.000Z",
    likeCount: 12
  },
  {
    id: "starter-upload-grace-cathedral",
    placeId: "grace-cathedral",
    userId: currentUserId,
    imageUrl: "/generated/grace-cathedral-stairs.png",
    caption: "Soft stone texture and a simple stair composition.",
    locationLabel: "Grace Cathedral",
    metadataText: "50mm, open shade",
    shotAtTimeOfDay: "Late afternoon",
    tags: ["architecture", "stairs", "portraits"],
    createdAt: "2026-07-06T23:05:00.000Z",
    likeCount: 8
  }
];

export const initialDemoState: DemoState = {
  savedPlaceIds: ["coit-tower", "grace-cathedral", "mission-murals", "golden-gate-overlook"],
  followedUserIds: ["user-maya", "user-eli"],
  likedPhotoIds: [],
  viewedPlaceIds: [],
  placeViews: [],
  lastViewedPlaceId: undefined,
  lastDiscoveryPlaceId: undefined,
  discoveryActiveIndex: 0,
  uploadedPhotos: starterUploadedPhotos
};

export function createInitialDemoState(): DemoState {
  return {
    savedPlaceIds: [...initialDemoState.savedPlaceIds],
    followedUserIds: [...initialDemoState.followedUserIds],
    likedPhotoIds: [],
    viewedPlaceIds: [],
    placeViews: [],
    lastViewedPlaceId: undefined,
    lastDiscoveryPlaceId: undefined,
    discoveryActiveIndex: 0,
    uploadedPhotos: starterUploadedPhotos.map((photo) => ({ ...photo }))
  };
}

export function normalizeDemoState(state?: Partial<DemoState> | null): DemoState {
  const initial = createInitialDemoState();
  const uploadedPhotos = state?.uploadedPhotos?.length
    ? [...starterUploadedPhotos.filter((photo) => !state.uploadedPhotos?.some((item) => item.id === photo.id)), ...state.uploadedPhotos]
    : initial.uploadedPhotos;

  return {
    ...initial,
    ...(state ?? {}),
    savedPlaceIds: Array.from(new Set([...(state?.savedPlaceIds ?? []), ...initial.savedPlaceIds])),
    followedUserIds: state?.followedUserIds ?? initial.followedUserIds,
    likedPhotoIds: state?.likedPhotoIds ?? initial.likedPhotoIds,
    viewedPlaceIds: state?.viewedPlaceIds ?? initial.viewedPlaceIds,
    placeViews: state?.placeViews ?? initial.placeViews,
    discoveryActiveIndex: state?.discoveryActiveIndex ?? initial.discoveryActiveIndex,
    uploadedPhotos,
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
