import { DEFAULT_SAVED_PLACE_IDS } from "./storage";
import type { DemoState, PlaceView } from "./types";

// Pure merge for the anonymous->auth identity migration (see
// docs/demo-to-product-audit.md item 1). A visitor's state can exist in two
// places when a real Supabase auth session (anonymous or upgraded) first
// bootstraps: the browser's localStorage blob, and/or a remote
// `oculi_demo_states` row keyed by the old client-generated `visitor-<uuid>`
// id. `mergeDemoStates` combines two DemoState values with no knowledge of
// which one is "primary" - array-valued fields are unioned, and scalar
// fields defer to whichever state has more recent activity.

export function unionPreserveOrder(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  [...a, ...b].forEach((id) => {
    if (seen.has(id)) return;
    seen.add(id);
    result.push(id);
  });
  return result;
}

function mergeById<T extends { id: string; createdAt: string }>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>();
  [...a, ...b].forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values()).sort(
    (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime(),
  );
}

function mergePlaceViews(a: PlaceView[], b: PlaceView[]): PlaceView[] {
  const byPlaceId = new Map<string, PlaceView>();
  [...a, ...b].forEach((view) => {
    const existing = byPlaceId.get(view.placeId);
    if (!existing) {
      byPlaceId.set(view.placeId, view);
      return;
    }
    const viewIsNewer = new Date(view.viewedAt).getTime() >= new Date(existing.viewedAt).getTime();
    byPlaceId.set(view.placeId, {
      placeId: view.placeId,
      viewedAt: viewIsNewer ? view.viewedAt : existing.viewedAt,
      viewCount: Math.max(view.viewCount, existing.viewCount),
    });
  });
  return Array.from(byPlaceId.values());
}

function latestActivityAt(state: DemoState): number {
  return state.placeViews.reduce((max, view) => Math.max(max, new Date(view.viewedAt).getTime()), 0);
}

/**
 * Decides which reconciled saved-place ids should be migrated up into the
 * durable `saved_places` table on bootstrap (docs/demo-to-product-audit.md
 * follow-up: default-save inflation). `mergedSavedPlaceIds` is every id
 * unioned in from all reconciliation sources, but some of those sources
 * (a fresh `loadLocalDemoState()`/`createInitialDemoState()` fallback)
 * fabricate the seed-default saved places for every brand-new visitor with
 * zero real user action -- migrating those would create a `saved_places`
 * row (and inflate that place's public save count) for someone who never
 * clicked Save.
 *
 * Non-default ids always migrate: a non-default id can only appear in
 * `mergedSavedPlaceIds` via a real toggle (`setSavedPlaceRemote`), a real
 * legacy state-blob row, or a real per-entity table row -- there's no
 * fallback path that fabricates them.
 *
 * A default id only migrates if it's independently proven by a *durable*
 * source: already present in the owner's own `saved_places` rows
 * (`alreadyDurableSavedPlaceIds`), or in any other durable source
 * (`otherDurableSavedPlaceIds` -- another identity's per-entity table rows,
 * or a pre-migration state-blob row read via
 * `loadLegacyRelationsFromStateRow`, which returns an empty result rather
 * than fabricating defaults when there's no row). Ids already durable are
 * filtered out either way since writing them again would be a no-op.
 */
export function selectSavedPlaceIdsToMigrate(
  mergedSavedPlaceIds: string[],
  alreadyDurableSavedPlaceIds: string[],
  otherDurableSavedPlaceIds: string[],
  defaultSavedPlaceIds: readonly string[] = DEFAULT_SAVED_PLACE_IDS,
): string[] {
  const proven = new Set([...alreadyDurableSavedPlaceIds, ...otherDurableSavedPlaceIds]);

  return mergedSavedPlaceIds.filter((id) => {
    if (alreadyDurableSavedPlaceIds.includes(id)) return false;
    if (!defaultSavedPlaceIds.includes(id)) return true;
    return proven.has(id);
  });
}

/** Merges two DemoState values with no ordering assumption between them. */
export function mergeDemoStates(a: DemoState, b: DemoState): DemoState {
  const aIsNewer = latestActivityAt(a) >= latestActivityAt(b);
  const newer = aIsNewer ? a : b;
  const older = aIsNewer ? b : a;

  return {
    savedPlaceIds: unionPreserveOrder(a.savedPlaceIds, b.savedPlaceIds),
    itineraryPlaceIds: unionPreserveOrder(a.itineraryPlaceIds, b.itineraryPlaceIds),
    followedUserIds: unionPreserveOrder(a.followedUserIds, b.followedUserIds),
    likedPhotoIds: unionPreserveOrder(a.likedPhotoIds, b.likedPhotoIds),
    viewedPhotoIds: unionPreserveOrder(a.viewedPhotoIds, b.viewedPhotoIds),
    viewedPlaceIds: unionPreserveOrder(a.viewedPlaceIds, b.viewedPlaceIds),
    placeViews: mergePlaceViews(a.placeViews, b.placeViews),
    lastViewedPlaceId: newer.lastViewedPlaceId ?? older.lastViewedPlaceId,
    lastDiscoveryPlaceId: newer.lastDiscoveryPlaceId ?? older.lastDiscoveryPlaceId,
    discoveryActiveIndex: newer.discoveryActiveIndex,
    uploadedPhotos: mergeById(a.uploadedPhotos, b.uploadedPhotos),
    profile: newer.profile,
  };
}
