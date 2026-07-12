export type User = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  bio: string;
  homeArea: string;
  followerCount: number;
  followingCount: number;
  isInfluencer?: boolean;
};

export type Area = {
  id: string;
  name: string;
  region: string;
  centerLat: number;
  centerLng: number;
  description: string;
  coverPhotoUrl: string;
};

export type Place = {
  id: string;
  areaId: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  fuzzyLocationLabel: string;
  navigationAddress?: string;
  timCurated: boolean;
  saveCount: number;
  recentActivityScore: number;
  bestTimes: string[];
  tags: string[];
  /** Curated scene taxonomy (subset of the eight canonical scene values). */
  sceneTypes: string[];
  /** Curated ease of reaching the spot. */
  easeOfVisit: "Easy" | "Moderate" | "Difficult";
  /** Curated, filter-grade light windows (subset of the six canonical light values). */
  bestLight: string[];
  coverPhotoUrl: string;
};

export type Photo = {
  id: string;
  placeId: string;
  userId: string;
  imageUrl: string;
  caption: string;
  locationLabel: string;
  metadataText?: string;
  shotAtTimeOfDay?: string;
  tags: string[];
  createdAt: string;
  likeCount: number;
};

export type AddPhotoInput = {
  placeId: string;
  imageUrl: string;
  file?: File;
  caption: string;
  metadataText?: string;
  shotAtTimeOfDay?: string;
  tags?: string[];
  locationLabel?: string;
};

export type EditableProfile = {
  name: string;
  username: string;
  avatarUrl: string;
  bio: string;
  homeArea: string;
  favoriteTags: string[];
};

export type PlaceView = {
  placeId: string;
  viewedAt: string;
  viewCount: number;
};

export type DemoState = {
  savedPlaceIds: string[];
  /** Ordered place ids the user hand-picked for their saved itinerary. */
  itineraryPlaceIds: string[];
  followedUserIds: string[];
  likedPhotoIds: string[];
  viewedPhotoIds: string[];
  viewedPlaceIds: string[];
  placeViews: PlaceView[];
  lastViewedPlaceId?: string;
  lastDiscoveryPlaceId?: string;
  discoveryActiveIndex: number;
  uploadedPhotos: Photo[];
  profile: EditableProfile;
};
