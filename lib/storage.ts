import type { DemoState } from "./types";
import { comments } from "./data";

export const STORAGE_KEY = "oculi-demo-state-v1";

export const initialDemoState: DemoState = {
  savedPlaceIds: ["golden-gate-overlook", "baker-beach"],
  followedUserIds: ["user-maya", "user-eli"],
  likedPhotoIds: [],
  likedCommentIds: [],
  likedReplyIds: [],
  uploadedPhotos: [],
  comments
};

export function createInitialDemoState(): DemoState {
  return {
    savedPlaceIds: [...initialDemoState.savedPlaceIds],
    followedUserIds: [...initialDemoState.followedUserIds],
    likedPhotoIds: [],
    likedCommentIds: [],
    likedReplyIds: [],
    uploadedPhotos: [],
    comments: initialDemoState.comments.map((comment) => ({
      ...comment,
      replies: [...comment.replies]
    }))
  };
}

export function loadDemoState(): DemoState {
  if (typeof window === "undefined") return createInitialDemoState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialDemoState();
    return { ...createInitialDemoState(), ...JSON.parse(raw) };
  } catch {
    return createInitialDemoState();
  }
}

export function saveDemoState(state: DemoState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Demo-only base64 uploads can exceed localStorage; keep the UI running.
  }
}

export function resetDemoState(): DemoState {
  const state = createInitialDemoState();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return state;
}
