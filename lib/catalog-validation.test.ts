import { describe, expect, it } from "vitest";
import {
  parseAreaPayload,
  parsePhotoPayload,
  parsePlacePayload,
  parseUserPayload,
} from "./catalog-validation";

function validPhoto() {
  return {
    id: "upload-123",
    placeId: "fort-point",
    userId: "user-guest",
    imageUrl: "https://example.com/photo.png",
    caption: "Testing",
    locationLabel: "Fort Point",
    createdAt: "2026-07-09T09:42:40.722Z",
    likeCount: 0,
    tags: ["fog", "bridge"],
    metadataText: "50mm",
    shotAtTimeOfDay: "Golden hour",
  };
}

function validPlace() {
  return {
    id: "place-1",
    areaId: "area-1",
    name: "Test Place",
    description: "A place",
    lat: 1,
    lng: 2,
    fuzzyLocationLabel: "Somewhere",
    timCurated: true,
    saveCount: 4,
    recentActivityScore: 2,
    bestTimes: ["Morning"],
    tags: ["bridge"],
    sceneTypes: ["bridge"],
    easeOfVisit: "Easy" as const,
    bestLight: ["Golden hour"],
    coverPhotoUrl: "https://example.com/cover.jpg",
  };
}

function validArea() {
  return {
    id: "area-1",
    name: "San Francisco",
    region: "California",
    centerLat: 37.7,
    centerLng: -122.4,
    description: "The city",
    coverPhotoUrl: "https://example.com/area.jpg",
  };
}

function validUser() {
  return {
    id: "user-1",
    name: "Test User",
    username: "@test",
    avatarUrl: "https://example.com/avatar.jpg",
    bio: "Bio",
    homeArea: "SF",
    followerCount: 1,
    followingCount: 2,
  };
}

describe("parsePhotoPayload", () => {
  it("accepts a valid photo payload", () => {
    expect(parsePhotoPayload(validPhoto())).toEqual(validPhoto());
  });

  it("accepts a valid payload without optional fields", () => {
    const { metadataText, shotAtTimeOfDay, ...rest } = validPhoto();
    expect(parsePhotoPayload(rest)).toEqual(rest);
  });

  it("rejects the exact malformed shape that previously crashed the app", () => {
    expect(parsePhotoPayload({ id: "x", test: true })).toBeNull();
  });

  it("rejects a payload missing the tags array", () => {
    const { tags, ...rest } = validPhoto();
    expect(parsePhotoPayload(rest)).toBeNull();
  });

  it("rejects a payload where tags is not an array", () => {
    expect(parsePhotoPayload({ ...validPhoto(), tags: "not-an-array" })).toBeNull();
  });

  it("tolerates extra unknown fields", () => {
    expect(parsePhotoPayload({ ...validPhoto(), extraField: "ignored", another: 42 })).toEqual(
      validPhoto(),
    );
  });

  it("rejects null and non-object payloads", () => {
    expect(parsePhotoPayload(null)).toBeNull();
    expect(parsePhotoPayload(undefined)).toBeNull();
    expect(parsePhotoPayload("a string")).toBeNull();
    expect(parsePhotoPayload(42)).toBeNull();
    expect(parsePhotoPayload([])).toBeNull();
  });

  it("rejects a payload with the wrong type for likeCount", () => {
    expect(parsePhotoPayload({ ...validPhoto(), likeCount: "0" })).toBeNull();
  });

  it("accepts an empty-string userId (photos-table rows with no owner_id, e.g. the migrated legacy upload)", () => {
    expect(parsePhotoPayload({ ...validPhoto(), userId: "" })).toEqual({ ...validPhoto(), userId: "" });
  });

  it("still rejects a missing userId key entirely", () => {
    const { userId, ...rest } = validPhoto();
    expect(parsePhotoPayload(rest)).toBeNull();
  });
});

describe("parsePlacePayload", () => {
  it("accepts a valid place payload", () => {
    expect(parsePlacePayload(validPlace())).toEqual(validPlace());
  });

  it("rejects a payload missing sceneTypes", () => {
    const { sceneTypes, ...rest } = validPlace();
    expect(parsePlacePayload(rest)).toBeNull();
  });

  it("rejects an invalid easeOfVisit value", () => {
    expect(parsePlacePayload({ ...validPlace(), easeOfVisit: "Impossible" })).toBeNull();
  });

  it("tolerates extra unknown fields", () => {
    expect(parsePlacePayload({ ...validPlace(), extra: "ignored" })).toEqual(validPlace());
  });

  it("rejects the malformed test shape", () => {
    expect(parsePlacePayload({ id: "x", test: true })).toBeNull();
  });
});

describe("parseAreaPayload", () => {
  it("accepts a valid area payload", () => {
    expect(parseAreaPayload(validArea())).toEqual(validArea());
  });

  it("rejects a payload missing centerLat", () => {
    const { centerLat, ...rest } = validArea();
    expect(parseAreaPayload(rest)).toBeNull();
  });

  it("tolerates extra unknown fields", () => {
    expect(parseAreaPayload({ ...validArea(), extra: "ignored" })).toEqual(validArea());
  });

  it("rejects the malformed test shape", () => {
    expect(parseAreaPayload({ id: "x", test: true })).toBeNull();
  });
});

describe("parseUserPayload", () => {
  it("accepts a valid user payload", () => {
    expect(parseUserPayload(validUser())).toEqual(validUser());
  });

  it("rejects a payload missing followerCount", () => {
    const { followerCount, ...rest } = validUser();
    expect(parseUserPayload(rest)).toBeNull();
  });

  it("tolerates extra unknown fields", () => {
    expect(parseUserPayload({ ...validUser(), extra: "ignored" })).toEqual(validUser());
  });

  it("rejects the malformed test shape", () => {
    expect(parseUserPayload({ id: "x", test: true })).toBeNull();
  });
});
