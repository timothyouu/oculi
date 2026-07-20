import type { Place } from "./types";

// `saveCount` used to be fictional seed data running into the hundreds/thousands, so a
// flat `saveCount * 100` weight made sense. All seed baselines were zeroed
// (docs/demo-to-product-implementation.md item 4's "Knock-on work"); real saveCount now
// starts at 0 for every place and grows one row at a time as actual users save it, so it
// sits at 0 or a low single digit for a long time. A flat linear weight at the old scale
// would let one accidental save leapfrog a place with far higher curated/recency signal,
// and a linear weight at a *new* scale would make save #1 and save #10 equally
// insignificant. Log-scaling gives the first save a real, felt bump (comparable to a few
// points of `recentActivityScore`, which ranges roughly 56-95 across the catalog) while
// flattening out the marginal value of each additional save, so recency/curation keep
// dominating for as long as real save counts stay small.
const SAVE_SCORE_WEIGHT = 8;

/** Log-scaled contribution of `saveCount` to a composite score. Exported so other
 * modules that blend saveCount into their own scoring (route planning, map clustering)
 * can reuse the same curve instead of re-deriving their own weighting. */
export function saveCountBoost(saveCount: number, weight: number = SAVE_SCORE_WEIGHT) {
  return Math.log2(Math.max(saveCount, 0) + 1) * weight;
}

export function topPlaceScore(place: Place) {
  return (place.timCurated ? 1_000_000 : 0) + place.recentActivityScore + saveCountBoost(place.saveCount);
}

export function compareTopPlaces(a: Place, b: Place): number {
  if (a.timCurated !== b.timCurated) {
    return a.timCurated ? -1 : 1;
  }

  const scoreDiff = topPlaceScore(b) - topPlaceScore(a);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  return a.name.localeCompare(b.name);
}

export function sortTopPlaces(places: Place[], limit?: number) {
  const sorted = [...places].sort(compareTopPlaces);
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export function getTopPlaces(places: Place[], limit?: number) {
  return sortTopPlaces(places, limit);
}

// The old `saveCount > 650` cutoff assumed four-figure fictional counts and is now
// permanently unreachable against real data starting at 0. Rescaled to a small absolute
// floor (a handful of genuine saves is already a meaningful signal this early — see
// DESIGN GUIDANCE) combined with a relative top-decile check against the visible set
// when one is supplied, so an all-zero catalog awards no badge (nobody clears the floor)
// while a place that pulls ahead of its peers, even by a few real saves, still earns it.
// `places` is optional so this stays a drop-in replacement wherever only a single place
// is in scope (existing callers keep working with floor-only behavior).
const HIGHLY_SAVED_FLOOR = 3;
const HIGHLY_SAVED_TOP_DECILE = 0.1;

export function isHighlySaved(place: Place, places?: Place[]): boolean {
  if (place.saveCount < HIGHLY_SAVED_FLOOR) return false;
  if (!places || places.length === 0) return true;

  const sortedCounts = places.map((candidate) => candidate.saveCount).sort((a, b) => b - a);
  const rank = sortedCounts.filter((count) => count > place.saveCount).length;
  const topDecileSize = Math.max(1, Math.ceil(sortedCounts.length * HIGHLY_SAVED_TOP_DECILE));

  return rank < topDecileSize;
}

export function topTierReason(place: Place, places?: Place[]) {
  if (place.timCurated) return "Curated pick";
  if (isHighlySaved(place, places)) return "Highly saved";
  return "Recently active";
}

export const getTopPlaceReason = topTierReason;
