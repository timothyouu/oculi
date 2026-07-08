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
 * Derives how hard a place is to reach from its own tags, best-shooting times,
 * and description. This is intentionally pure so both the map filters and the
 * place-detail stats row can share a single source of truth instead of
 * hardcoding a difficulty label.
 */
export function accessibilityForPlace(place: Place): PlaceAccessibility {
  const text = normalizedText([place.tags, place.bestTimes, place.description]);

  if (DIFFICULT_TERMS.some((term) => text.includes(term))) {
    return "Difficult";
  }

  if (MODERATE_TERMS.some((term) => text.includes(term))) {
    return "Moderate";
  }

  return "Easy";
}
