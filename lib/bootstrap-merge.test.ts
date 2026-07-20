import { describe, expect, it } from "vitest";
import { applyBootstrapState, type RelationKey } from "./bootstrap-merge";
import type { UserRelations } from "./remote-state";
import { initialDemoState } from "./storage";
import type { DemoState } from "./types";

function stateWith(relations: Partial<UserRelations>): DemoState {
  return {
    ...initialDemoState,
    savedPlaceIds: [],
    followedUserIds: [],
    likedPhotoIds: [],
    viewedPhotoIds: [],
    ...relations,
  };
}

const merged: UserRelations = {
  savedPlaceIds: ["golden-gate-overlook"],
  followedUserIds: ["user-maya"],
  likedPhotoIds: ["photo-1"],
  viewedPhotoIds: ["photo-2"],
};

describe("applyBootstrapState", () => {
  it("takes the bootstrap-merged relations when the user touched nothing", () => {
    const result = applyBootstrapState(stateWith({}), stateWith({}), merged, new Set());
    expect(result.savedPlaceIds).toEqual(["golden-gate-overlook"]);
    expect(result.followedUserIds).toEqual(["user-maya"]);
    expect(result.likedPhotoIds).toEqual(["photo-1"]);
    expect(result.viewedPhotoIds).toEqual(["photo-2"]);
  });

  it("does not resurrect an unsave performed while bootstrap was in flight", () => {
    // The user unsaved golden-gate-overlook after the bootstrap fetch read it.
    const prev = stateWith({ savedPlaceIds: [] });
    const result = applyBootstrapState(prev, stateWith({}), merged, new Set<RelationKey>(["savedPlaceIds"]));
    expect(result.savedPlaceIds).toEqual([]);
    // Untouched relations still hydrate from the merge.
    expect(result.followedUserIds).toEqual(["user-maya"]);
  });

  it("keeps a save performed while bootstrap was in flight", () => {
    const prev = stateWith({ savedPlaceIds: ["coit-tower"] });
    const result = applyBootstrapState(prev, stateWith({}), merged, new Set<RelationKey>(["savedPlaceIds"]));
    expect(result.savedPlaceIds).toEqual(["coit-tower"]);
  });

  it("guards each relation independently", () => {
    const prev = stateWith({ likedPhotoIds: ["photo-9"], viewedPhotoIds: ["photo-8"] });
    const result = applyBootstrapState(
      prev,
      stateWith({}),
      merged,
      new Set<RelationKey>(["likedPhotoIds", "viewedPhotoIds"]),
    );
    expect(result.likedPhotoIds).toEqual(["photo-9"]);
    expect(result.viewedPhotoIds).toEqual(["photo-8"]);
    expect(result.savedPlaceIds).toEqual(["golden-gate-overlook"]);
    expect(result.followedUserIds).toEqual(["user-maya"]);
  });
});
