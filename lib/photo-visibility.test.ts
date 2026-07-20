import { describe, expect, it } from "vitest";
import { isPhotoVisibleToViewer } from "./photo-visibility";

describe("isPhotoVisibleToViewer", () => {
  it("shows approved photos to everyone", () => {
    expect(isPhotoVisibleToViewer({ moderationStatus: "approved", ownerId: "user-a" }, null)).toBe(true);
    expect(isPhotoVisibleToViewer({ moderationStatus: "approved", ownerId: "user-a" }, "user-b")).toBe(true);
  });

  it("shows pending photos to everyone (publish-immediately posture)", () => {
    expect(isPhotoVisibleToViewer({ moderationStatus: "pending", ownerId: "user-a" }, null)).toBe(true);
    expect(isPhotoVisibleToViewer({ moderationStatus: "pending", ownerId: "user-a" }, "user-b")).toBe(true);
  });

  it("hides rejected photos from anonymous viewers and non-owners", () => {
    expect(isPhotoVisibleToViewer({ moderationStatus: "rejected", ownerId: "user-a" }, null)).toBe(false);
    expect(isPhotoVisibleToViewer({ moderationStatus: "rejected", ownerId: "user-a" }, "user-b")).toBe(false);
  });

  it("shows rejected photos to their own owner", () => {
    expect(isPhotoVisibleToViewer({ moderationStatus: "rejected", ownerId: "user-a" }, "user-a")).toBe(true);
  });

  it("hides a rejected photo with no owner from everyone (nothing to attribute ownership to)", () => {
    expect(isPhotoVisibleToViewer({ moderationStatus: "rejected", ownerId: null }, "user-a")).toBe(false);
  });

  it("treats a missing moderation_status as visible (defaults to pending in the DB, never null in practice)", () => {
    expect(isPhotoVisibleToViewer({ moderationStatus: undefined, ownerId: "user-a" }, null)).toBe(true);
    expect(isPhotoVisibleToViewer({ moderationStatus: null, ownerId: "user-a" }, null)).toBe(true);
  });
});
