import type { UserRelations } from "./remote-state";
import type { DemoState } from "./types";

export type RelationKey = keyof UserRelations;

/**
 * Applies a resolved bootstrap hydration on top of whatever the user has
 * done since the page mounted. Bootstrap (lib/demo-state.tsx) fetches
 * remote state + relation tables asynchronously while the UI is already
 * interactive from localStorage — so a save/unsave/like/follow performed
 * during that window used to be clobbered when the late-resolving bootstrap
 * setState'd its (stale, fetched-before-the-action) merged relation set,
 * resurrecting e.g. a just-unsaved place. For any relation the user touched
 * since mount, the in-memory value wins (the toggle handlers already wrote
 * the granular remote row, so it is durably correct); untouched relations
 * take the bootstrap-merged value as before.
 */
export function applyBootstrapState(
  prev: DemoState,
  base: DemoState,
  merged: UserRelations,
  touched: ReadonlySet<RelationKey>,
): DemoState {
  return {
    ...base,
    savedPlaceIds: touched.has("savedPlaceIds") ? prev.savedPlaceIds : merged.savedPlaceIds,
    followedUserIds: touched.has("followedUserIds") ? prev.followedUserIds : merged.followedUserIds,
    likedPhotoIds: touched.has("likedPhotoIds") ? prev.likedPhotoIds : merged.likedPhotoIds,
    viewedPhotoIds: touched.has("viewedPhotoIds") ? prev.viewedPhotoIds : merged.viewedPhotoIds,
  };
}
