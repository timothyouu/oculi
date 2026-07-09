import type { Place } from "./types";

export type PlaceAccessibility = "Easy" | "Moderate" | "Difficult";

export const accessibilityOptions: PlaceAccessibility[] = ["Easy", "Moderate", "Difficult"];

const DIFFICULT_TERMS = ["trail", "ruins", "long exposure", "night", "low tide"];
const MODERATE_TERMS = ["coast", "overlook", "skyline", "bridge", "waterfront", "beach"];

function normalizedText(parts: Array<string | string[] | undefined>): string {
  return parts
    .flatMap((part) => (Array.isArray(part) ? part : part ? [part] : []))
    .join(" ")
    .toLowerCase();
}

/**
 * Reports how hard a place is to reach. Prefers the curated `easeOfVisit` field
 * (the source of truth the map's "Ease of visit" filter matches against) and
 * only falls back to deriving from tags/best-times/description for any place
 * that predates the field. Pure so the map filters and the place-detail stats
 * row share one implementation.
 */
export function accessibilityForPlace(place: Place): PlaceAccessibility {
  if (place.easeOfVisit && accessibilityOptions.includes(place.easeOfVisit)) {
    return place.easeOfVisit;
  }

  const text = normalizedText([place.tags, place.bestTimes, place.description]);

  if (DIFFICULT_TERMS.some((term) => text.includes(term))) {
    return "Difficult";
  }

  if (MODERATE_TERMS.some((term) => text.includes(term))) {
    return "Moderate";
  }

  return "Easy";
}
