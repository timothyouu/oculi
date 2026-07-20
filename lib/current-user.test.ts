import { describe, expect, it } from "vitest";
import { buildCurrentUser, buildVisibleUsers } from "./current-user";
import type { EditableProfile, User } from "./types";

const seedTemplate: User = {
  id: "user-guest",
  name: "John Doe",
  username: "@john.doe",
  avatarUrl: "/generated/default-avatar.svg",
  bio: "Guest photographer collecting public photo spots around the city.",
  homeArea: "San Francisco",
  followerCount: 0,
  followingCount: 2,
};

const defaultProfile: EditableProfile = {
  name: "John Doe",
  username: "@john.doe",
  avatarUrl: "/generated/default-avatar.svg",
  bio: "Guest photographer collecting public photo spots around the city.",
  homeArea: "San Francisco",
  favoriteTags: ["fog", "bridge"],
};

const otherUsers: User[] = [
  { ...seedTemplate },
  {
    id: "user-maya",
    name: "Maya Chen",
    username: "@mayashoots",
    avatarUrl: "/generated/maya-chen.png",
    bio: "Golden hour, glass reflections, city walks.",
    homeArea: "Hayes Valley",
    followerCount: 4200,
    followingCount: 212,
  },
];

describe("buildCurrentUser", () => {
  it("uses the real viewer id, not the seed template's id", () => {
    const currentUser = buildCurrentUser(seedTemplate, "auth-uid-123", defaultProfile);
    expect(currentUser.id).toBe("auth-uid-123");
  });

  it("keeps seed display fields when the profile hasn't been edited", () => {
    const currentUser = buildCurrentUser(seedTemplate, "auth-uid-123", defaultProfile);
    expect(currentUser.name).toBe("John Doe");
    expect(currentUser.avatarUrl).toBe("/generated/default-avatar.svg");
  });

  it("lets an edited profile override the seed display fields", () => {
    const editedProfile: EditableProfile = { ...defaultProfile, name: "Alex Rivera", bio: "New bio." };
    const currentUser = buildCurrentUser(seedTemplate, "auth-uid-123", editedProfile);
    expect(currentUser.name).toBe("Alex Rivera");
    expect(currentUser.bio).toBe("New bio.");
    // Non-profile display fields (not part of EditableProfile) still come
    // from the seed template.
    expect(currentUser.followerCount).toBe(0);
  });
});

describe("buildVisibleUsers", () => {
  it("keeps the fictional seed persona as a separate entry once the viewer has a real, distinct id", () => {
    const currentUser = buildCurrentUser(seedTemplate, "auth-uid-123", defaultProfile);
    const visible = buildVisibleUsers(otherUsers, "auth-uid-123", currentUser);

    // Both the seed "user-guest" persona (author of starter uploads) and the
    // real viewer's own entry must be present and distinct.
    expect(visible.some((user) => user.id === "user-guest")).toBe(true);
    expect(visible.some((user) => user.id === "auth-uid-123")).toBe(true);
    expect(visible.length).toBe(otherUsers.length + 1);
  });

  it("replaces the seed persona's slot only during the pre-bootstrap window where the viewer id still equals it", () => {
    const currentUser = buildCurrentUser(seedTemplate, "user-guest", defaultProfile);
    const visible = buildVisibleUsers(otherUsers, "user-guest", currentUser);

    // No duplicate "user-guest" entries; exactly one, and it's the merged
    // current-user record (never both a stale seed copy and a new one).
    const guestEntries = visible.filter((user) => user.id === "user-guest");
    expect(guestEntries).toHaveLength(1);
    expect(visible.length).toBe(otherUsers.length);
  });

  it("never duplicates or drops unrelated users", () => {
    const currentUser = buildCurrentUser(seedTemplate, "auth-uid-999", defaultProfile);
    const visible = buildVisibleUsers(otherUsers, "auth-uid-999", currentUser);
    expect(visible.some((user) => user.id === "user-maya")).toBe(true);
    expect(new Set(visible.map((user) => user.id)).size).toBe(visible.length);
  });
});
