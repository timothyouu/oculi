import { currentUserId } from "./data";
import type { DemoState, Photo } from "./types";

export const DEMO_STATE_STORAGE_KEY = "oculi:demo-state";
export const DEMO_VISITOR_ID_STORAGE_KEY = "oculi:visitor-id";

export const starterUploadedPhotos: Photo[] = [
  {
    id: "starter-upload-baker-beach",
    placeId: "baker-beach",
    userId: currentUserId,
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Baker_Beach_%28211203223%29.jpeg/960px-Baker_Beach_%28211203223%29.jpeg",
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
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Palace_of_Fine_Arts_-_March_2018_%281491%29.jpg/960px-Palace_of_Fine_Arts_-_March_2018_%281491%29.jpg",
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
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/17_30_085_coit_tower.jpg/960px-17_30_085_coit_tower.jpg",
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
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Golden_Gate_Bridge_as_seen_from_Battery_East.jpg/960px-Golden_Gate_Bridge_as_seen_from_Battery_East.jpg",
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
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/House_Mission_San_Francisco.jpg/960px-House_Mission_San_Francisco.jpg",
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
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Attacked_%282204314787%29.jpg/960px-Attacked_%282204314787%29.jpg",
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
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/San_Francisco_Ferry_Building_%28cropped%29.jpg/960px-San_Francisco_Ferry_Building_%28cropped%29.jpg",
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
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Bernal_Heights_%2877582p%29.jpg/960px-Bernal_Heights_%2877582p%29.jpg",
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
  viewedPhotoIds: [],
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
    viewedPhotoIds: [],
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
  const uploadedPhotos = Array.isArray(state?.uploadedPhotos)
    ? state.uploadedPhotos
    : initial.uploadedPhotos;

  return {
    ...initial,
    ...(state ?? {}),
    savedPlaceIds: Array.isArray(state?.savedPlaceIds)
      ? Array.from(new Set(state.savedPlaceIds))
      : initial.savedPlaceIds,
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
