import { initialDemoState } from "./storage";
import type { UserRelations } from "./remote-state";

// docs/demo-to-product-implementation.md item 1 / LOOP.md Task 6a.
//
// Every fresh visitor's local `DemoState` starts pre-populated with a few
// demo-flavor saves/follows (`initialDemoState` in lib/storage.ts) that Tim
// decided fresh users keep -- but those defaults must never be pushed up
// into the real `saved_places`/`followed_users` tables (and thus public
// save/follow counts) just because a visitor loaded the app. The bootstrap
// reconciler in lib/demo-state.tsx unions relation state from localStorage,
// legacy state-blob rows, and the per-entity tables, then migrates anything
// missing from the tables upward; this module filters the demo-default ids
// out of that upward migration entirely.
//
// Default ids are excluded per-id, not via an all-or-nothing "is the whole
// set still the defaults" check: live verification showed that with the
// set-equality version, one explicit save of a fifth place made the merged
// set diverge from the defaults, and the next bootstrap migrated all four
// untouched defaults up alongside it -- inflating their public counts after
// all. Explicit toggles are unaffected by this filter because they never go
// through the reconciler: `toggleSavedPlace`/`toggleFollowUser` write their
// granular row directly and immediately (lib/demo-state.tsx), so a default
// place the user deliberately re-saves still gets its durable row and count.

/** The saved/followed ids every fresh visitor starts with, before any real
 * action. Sourced from the same constant as the seeded local state so the
 * two can never drift. */
export const DEFAULT_SAVED_PLACE_IDS: readonly string[] = initialDemoState.savedPlaceIds;
export const DEFAULT_FOLLOWED_USER_IDS: readonly string[] = initialDemoState.followedUserIds;

function withoutIds(ids: readonly string[], excluded: readonly string[]): string[] {
  const excludedSet = new Set(excluded);
  return ids.filter((id) => !excludedSet.has(id));
}

/**
 * Given the fully-merged relations for a visitor (union of localStorage,
 * legacy state-blob rows, and per-entity table rows), returns the subset
 * the bootstrap reconciler may write up to the per-entity tables: everything
 * except the demo-default saved-place/followed-user ids, which only an
 * explicit toggle (the direct granular write path) may ever persist.
 * `likedPhotoIds`/`viewedPhotoIds` have no non-empty default and always
 * pass through as-is.
 */
export function relationsToMigrateUp(merged: UserRelations): UserRelations {
  return {
    savedPlaceIds: withoutIds(merged.savedPlaceIds, DEFAULT_SAVED_PLACE_IDS),
    followedUserIds: withoutIds(merged.followedUserIds, DEFAULT_FOLLOWED_USER_IDS),
    likedPhotoIds: merged.likedPhotoIds,
    viewedPhotoIds: merged.viewedPhotoIds,
  };
}
