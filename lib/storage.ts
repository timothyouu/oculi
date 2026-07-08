import type { DemoState } from "./types";

export const initialDemoState: DemoState = {
  savedPlaceIds: ["golden-gate-overlook", "baker-beach"],
  followedUserIds: ["user-maya", "user-eli"],
  likedPhotoIds: [],
  viewedPlaceIds: [],
  placeViews: [],
  lastViewedPlaceId: undefined,
  lastDiscoveryPlaceId: undefined,
  discoveryActiveIndex: 0,
  uploadedPhotos: []
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
    uploadedPhotos: []
  };
}
