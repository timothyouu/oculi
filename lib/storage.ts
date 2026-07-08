import { currentUserId } from "./data";
import type { DemoState, Photo } from "./types";

export const DEMO_STATE_STORAGE_KEY = "oculi:demo-state";

export const starterUploadedPhotos: Photo[] = [
  {
    id: "starter-upload-baker-beach",
    placeId: "baker-beach",
    userId: currentUserId,
    imageUrl: "/generated/baker-beach-sunset-fog.png",
    caption: "Waited until the last warm strip hit the sand. The bridge tucked into fog just enough to make the frame feel quiet.",
    locationLabel: "Baker Beach",
    metadataText: "50mm, sunset fog, low angle from the north end",
    shotAtTimeOfDay: "Sunset",
    tags: ["beach", "bridge", "fog", "sunset"],
    createdAt: "2026-07-08T02:45:00.000Z",
    likeCount: 27
  },
  {
    id: "starter-upload-palace-lagoon",
    placeId: "palace-fine-arts",
    userId: currentUserId,
    imageUrl: "/generated/palace-fine-arts-morning.png",
    caption: "Morning shade under the rotunda kept the columns soft and the lagoon reflections clean.",
    locationLabel: "Palace of Fine Arts",
    metadataText: "85mm, open shade, reflection crop",
    shotAtTimeOfDay: "Morning",
    tags: ["architecture", "reflections", "portraits"],
    createdAt: "2026-07-07T17:30:00.000Z",
    likeCount: 19
  },
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
    id: "starter-upload-golden-gate-fog",
    placeId: "golden-gate-overlook",
    userId: currentUserId,
    imageUrl: "/generated/golden-gate-overlook-fog-break.png",
    caption: "A six-minute fog break from the overlook. Good reminder that the best bridge frame is usually a patience test.",
    locationLabel: "Golden Gate Bridge Overlook",
    metadataText: "135mm, blue-hour fog break, handheld",
    shotAtTimeOfDay: "Blue hour",
    tags: ["bridge", "fog", "telephoto"],
    createdAt: "2026-07-07T13:52:00.000Z",
    likeCount: 31
  },
  {
    id: "starter-upload-mission-murals",
    placeId: "mission-murals",
    userId: currentUserId,
    imageUrl: "/generated/mission-murals-color-v2.png",
    caption: "Flat sky day, so the mural color did the heavy lifting. Great portrait wall without needing direct sun.",
    locationLabel: "Mission Murals",
    metadataText: "35mm, overcast, color-block backdrop",
    shotAtTimeOfDay: "Daylight",
    tags: ["street", "color", "murals", "portraits"],
    createdAt: "2026-07-06T21:10:00.000Z",
    likeCount: 22
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
  },
  {
    id: "starter-upload-embarcadero-blue-hour",
    placeId: "embarcadero",
    userId: currentUserId,
    imageUrl: "/generated/embarcadero-blue-hour.png",
    caption: "Ferry lights and glass reflections lined up right after sunset. This spot feels built for quick blue-hour walks.",
    locationLabel: "Embarcadero Waterfront",
    metadataText: "35mm, handheld, wet pavement reflection",
    shotAtTimeOfDay: "Blue hour",
    tags: ["waterfront", "reflections", "street"],
    createdAt: "2026-07-05T04:38:00.000Z",
    likeCount: 17
  },
  {
    id: "starter-upload-bernal-heights",
    placeId: "bernal-heights",
    userId: currentUserId,
    imageUrl: "/generated/bernal-heights-golden-hour.png",
    caption: "Softer skyline angle than Twin Peaks, with warm grass foregrounds and fewer people in the way.",
    locationLabel: "Bernal Heights Park",
    metadataText: "50mm, golden grass, skyline compression",
    shotAtTimeOfDay: "Golden hour",
    tags: ["skyline", "golden hour", "trail"],
    createdAt: "2026-07-04T02:55:00.000Z",
    likeCount: 15
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
  uploadedPhotos: starterUploadedPhotos,
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
    followedUserIds: [...initialDemoState.followedUserIds],
    likedPhotoIds: [],
    viewedPlaceIds: [],
    placeViews: [],
    lastViewedPlaceId: undefined,
    lastDiscoveryPlaceId: undefined,
    discoveryActiveIndex: 0,
    uploadedPhotos: starterUploadedPhotos.map((photo) => ({ ...photo })),
    profile: {
      ...initialDemoState.profile,
      favoriteTags: [...initialDemoState.profile.favoriteTags],
    },
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
