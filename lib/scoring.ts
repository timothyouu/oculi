import type { Place } from "./types";

export function compareTopPlaces(a: Place, b: Place): number {
  if (a.timCurated !== b.timCurated) {
    return a.timCurated ? -1 : 1;
  }

  if (a.saveCount !== b.saveCount) {
    return b.saveCount - a.saveCount;
  }

  if (a.recentActivityScore !== b.recentActivityScore) {
    return b.recentActivityScore - a.recentActivityScore;
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

export function topPlaceScore(place: Place) {
  return (place.timCurated ? 1_000_000 : 0) + place.saveCount * 100 + place.recentActivityScore;
}

export function topTierReason(place: Place) {
  if (place.timCurated) return "Tim-curated pick";
  if (place.saveCount > 650) return "Highly saved";
  return "Recently active";
}

export const getTopPlaceReason = topTierReason;
