import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOLLOWED_USER_IDS,
  DEFAULT_SAVED_PLACE_IDS,
  relationsToMigrateUp,
} from "./relation-defaults";
import type { UserRelations } from "./remote-state";

function relations(overrides: Partial<UserRelations> = {}): UserRelations {
  return {
    savedPlaceIds: [],
    followedUserIds: [],
    likedPhotoIds: [],
    viewedPhotoIds: [],
    ...overrides,
  };
}

describe("relationsToMigrateUp", () => {
  it("excludes untouched default saved places and followed users from upward migration", () => {
    const merged = relations({
      savedPlaceIds: [...DEFAULT_SAVED_PLACE_IDS],
      followedUserIds: [...DEFAULT_FOLLOWED_USER_IDS],
    });

    const result = relationsToMigrateUp(merged);

    expect(result.savedPlaceIds).toEqual([]);
    expect(result.followedUserIds).toEqual([]);
  });

  it("migrates only the non-default id after an explicit save alongside the defaults", () => {
    // Regression for the live-verified inflation leak: with the old
    // all-or-nothing set-equality gate, one explicit save of twin-peaks made
    // the merged set diverge from the defaults and the next bootstrap
    // migrated all four untouched defaults up with it.
    const merged = relations({
      savedPlaceIds: [...DEFAULT_SAVED_PLACE_IDS, "twin-peaks"],
    });

    const result = relationsToMigrateUp(merged);

    expect(result.savedPlaceIds).toEqual(["twin-peaks"]);
  });

  it("still excludes remaining default follows when one default was removed", () => {
    const merged = relations({
      followedUserIds: DEFAULT_FOLLOWED_USER_IDS.filter((id) => id !== DEFAULT_FOLLOWED_USER_IDS[0]),
    });

    const result = relationsToMigrateUp(merged);

    expect(result.followedUserIds).toEqual([]);
  });

  it("never gates likedPhotoIds/viewedPhotoIds, which have no non-empty default", () => {
    const merged = relations({ likedPhotoIds: ["photo-1"], viewedPhotoIds: ["photo-2"] });

    const result = relationsToMigrateUp(merged);

    expect(result.likedPhotoIds).toEqual(["photo-1"]);
    expect(result.viewedPhotoIds).toEqual(["photo-2"]);
  });

  it("passes through an entirely non-default relation set untouched (explicit saves survive)", () => {
    const merged = relations({ savedPlaceIds: ["twin-peaks", "baker-beach"] });

    const result = relationsToMigrateUp(merged);

    expect(result.savedPlaceIds).toEqual(["twin-peaks", "baker-beach"]);
  });
});
