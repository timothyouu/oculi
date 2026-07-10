// Defensive hydration for catalog/photo payloads loaded from Supabase
// (docs/demo-to-product-audit.md item 3). `loadRemoteDemoCatalog` and the
// `photos` table load path both trust rows written by other clients (or,
// previously, hand-inserted test rows) -- a single malformed payload used to
// propagate straight into app state and crash the app downstream (e.g. an
// `.some()`/`.map()` call on a missing array field). These are pure,
// DOM-free validators: given an `unknown` payload, return a well-typed
// value or `null` for anything that doesn't satisfy the shape. Callers are
// responsible for filtering nulls and logging a `console.warn` per skipped
// row (kept out of here so this module stays a pure predicate/parser, easy
// to unit test without spying on console).

import type { Area, Photo, Place, User } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Parses/validates a Photo payload. Returns null if required fields are missing or malformed. */
export function parsePhotoPayload(payload: unknown): Photo | null {
  if (!isRecord(payload)) return null;
  const { id, placeId, userId, imageUrl, caption, locationLabel, createdAt, likeCount, tags } = payload;

  if (
    !isNonEmptyString(id) ||
    !isNonEmptyString(placeId) ||
    // userId may legitimately be an empty string: photos-table rows with no
    // owner_id (e.g. the pre-auth legacy row migrated in
    // 20260710000500_migrate_uploads_to_photos_table.sql) map to userId ""
    // rather than a fabricated id, so this is intentionally lenient.
    !isString(userId) ||
    !isNonEmptyString(imageUrl) ||
    !isString(caption) ||
    !isString(locationLabel) ||
    !isNonEmptyString(createdAt) ||
    !isNumber(likeCount) ||
    !isStringArray(tags)
  ) {
    return null;
  }

  const metadataText = payload.metadataText;
  const shotAtTimeOfDay = payload.shotAtTimeOfDay;
  if (metadataText !== undefined && !isString(metadataText)) return null;
  if (shotAtTimeOfDay !== undefined && !isString(shotAtTimeOfDay)) return null;

  return {
    id,
    placeId,
    userId,
    imageUrl,
    caption,
    locationLabel,
    createdAt,
    likeCount,
    tags,
    ...(metadataText !== undefined ? { metadataText } : {}),
    ...(shotAtTimeOfDay !== undefined ? { shotAtTimeOfDay } : {}),
  };
}

/** Parses/validates a Place payload. Returns null if required fields are missing or malformed. */
export function parsePlacePayload(payload: unknown): Place | null {
  if (!isRecord(payload)) return null;
  const {
    id,
    areaId,
    name,
    description,
    lat,
    lng,
    fuzzyLocationLabel,
    timCurated,
    saveCount,
    recentActivityScore,
    bestTimes,
    tags,
    sceneTypes,
    easeOfVisit,
    bestLight,
    coverPhotoUrl,
  } = payload;

  if (
    !isNonEmptyString(id) ||
    !isNonEmptyString(areaId) ||
    !isNonEmptyString(name) ||
    !isString(description) ||
    !isNumber(lat) ||
    !isNumber(lng) ||
    !isString(fuzzyLocationLabel) ||
    typeof timCurated !== "boolean" ||
    !isNumber(saveCount) ||
    !isNumber(recentActivityScore) ||
    !isStringArray(bestTimes) ||
    !isStringArray(tags) ||
    !isStringArray(sceneTypes) ||
    (easeOfVisit !== "Easy" && easeOfVisit !== "Moderate" && easeOfVisit !== "Difficult") ||
    !isStringArray(bestLight) ||
    !isNonEmptyString(coverPhotoUrl)
  ) {
    return null;
  }

  const navigationAddress = payload.navigationAddress;
  if (navigationAddress !== undefined && !isString(navigationAddress)) return null;

  return {
    id,
    areaId,
    name,
    description,
    lat,
    lng,
    fuzzyLocationLabel,
    timCurated,
    saveCount,
    recentActivityScore,
    bestTimes,
    tags,
    sceneTypes,
    easeOfVisit,
    bestLight,
    coverPhotoUrl,
    ...(navigationAddress !== undefined ? { navigationAddress } : {}),
  };
}

/** Parses/validates an Area payload. Returns null if required fields are missing or malformed. */
export function parseAreaPayload(payload: unknown): Area | null {
  if (!isRecord(payload)) return null;
  const { id, name, region, centerLat, centerLng, description, coverPhotoUrl } = payload;

  if (
    !isNonEmptyString(id) ||
    !isNonEmptyString(name) ||
    !isString(region) ||
    !isNumber(centerLat) ||
    !isNumber(centerLng) ||
    !isString(description) ||
    !isNonEmptyString(coverPhotoUrl)
  ) {
    return null;
  }

  return { id, name, region, centerLat, centerLng, description, coverPhotoUrl };
}

/** Parses/validates a User payload. Returns null if required fields are missing or malformed. */
export function parseUserPayload(payload: unknown): User | null {
  if (!isRecord(payload)) return null;
  const {
    id,
    name,
    username,
    avatarUrl,
    bio,
    homeArea,
    followerCount,
    followingCount,
  } = payload;

  if (
    !isNonEmptyString(id) ||
    !isNonEmptyString(name) ||
    !isNonEmptyString(username) ||
    !isString(avatarUrl) ||
    !isString(bio) ||
    !isString(homeArea) ||
    !isNumber(followerCount) ||
    !isNumber(followingCount)
  ) {
    return null;
  }

  const isInfluencer = payload.isInfluencer;
  if (isInfluencer !== undefined && typeof isInfluencer !== "boolean") return null;

  return {
    id,
    name,
    username,
    avatarUrl,
    bio,
    homeArea,
    followerCount,
    followingCount,
    ...(isInfluencer !== undefined ? { isInfluencer } : {}),
  };
}
