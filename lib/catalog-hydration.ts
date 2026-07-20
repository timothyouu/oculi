// Pure helpers for `lib/remote-state.ts`'s `loadRemoteDemoCatalog`
// (docs/demo-to-product-implementation.md item 10 step 2 + item 4's count
// overlay). Kept DOM/Supabase-free so the "which source wins" and "how do
// counts get applied" logic is unit-testable without a real client.

/** Result of fetching one catalog kind (users/areas/places/seed-photos) from
 * the database: either it errored, or it returned some (possibly zero) rows
 * successfully. */
export type CatalogKindFetch<T> = {
  items: T[];
  error: boolean;
};

/**
 * Decides which item list is authoritative for one catalog kind, now that
 * the database is the source of truth (item 10) rather than a peer merged
 * with the bundled seed (item 2 of the same doc).
 *
 * - A failed fetch always falls back to the seed (offline/error cache).
 * - A *successful* fetch that came back with zero rows is treated as
 *   suspicious, not as "the catalog is really empty" -- every one of the
 *   four seed kinds (places/photos/users/areas) always has real rows in a
 *   healthy environment, so an empty-but-successful result is far more
 *   likely a transient RLS/API hiccup than an actually emptied table. In
 *   that case this also falls back to the seed, so a hiccup on one kind
 *   can't blank that whole part of the app.
 * - Otherwise the remote rows are the catalog outright -- no merging with
 *   the seed by id anymore.
 */
export function resolveCatalogKind<T>(seedItems: T[], remote: CatalogKindFetch<T>): T[] {
  if (remote.error) return seedItems;
  if (remote.items.length === 0 && seedItems.length > 0) return seedItems;
  return remote.items;
}

/** Replaces (not adds to) each place's `saveCount` with the real aggregate
 * from `saved_places` (`?? 0` for a place with no real saves yet). Seed
 * baselines are zero now (docs/demo-to-product-implementation.md item 4),
 * so this is a straight replace, not an overlay-on-top-of-fiction. */
export function overlaySaveCounts<T extends { id: string; saveCount: number }>(
  items: T[],
  saveCounts: Record<string, number>,
): T[] {
  return items.map((item) => ({ ...item, saveCount: saveCounts[item.id] ?? 0 }));
}

/** Replaces each user's `followerCount` with the real aggregate from
 * `followed_users`. */
export function overlayFollowerCounts<T extends { id: string; followerCount: number }>(
  items: T[],
  followCounts: Record<string, number>,
): T[] {
  return items.map((item) => ({ ...item, followerCount: followCounts[item.id] ?? 0 }));
}

/** Replaces each photo's `likeCount` with the real aggregate from
 * `liked_photos`. Applies to both seed catalog photos and real
 * `public.photos` upload rows -- both flow through the same merged photo
 * list before this runs. */
export function overlayLikeCounts<T extends { id: string; likeCount: number }>(
  items: T[],
  likeCounts: Record<string, number>,
): T[] {
  return items.map((item) => ({ ...item, likeCount: likeCounts[item.id] ?? 0 }));
}
