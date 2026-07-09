import type { Place } from "./types";

/**
 * Single source of truth for the map's scene and best-light vocabularies plus the pure
 * predicates the map filters run on. Kept DOM-free (no `mapbox-gl`, no lucide components) so it
 * stays unit-testable; the page maps the string `icon` keys below to actual icon components.
 */

export type SceneOption = {
  label: string;
  value: string;
  /** lucide icon name resolved to a component in the page. */
  icon: string;
};

export const SCENE_OPTIONS: SceneOption[] = [
  { label: "Landscape", value: "landscape", icon: "Mountain" },
  { label: "Cityscape", value: "skyline", icon: "Building2" },
  { label: "Seascape", value: "coast", icon: "Waves" },
  { label: "Architecture", value: "architecture", icon: "BookOpen" },
  { label: "Portraits", value: "portraits", icon: "Users" },
  { label: "Street", value: "street", icon: "MapPin" },
  { label: "Bridge", value: "bridge", icon: "Landmark" },
  { label: "Color", value: "color", icon: "Palette" },
];

export const SCENE_VALUES: string[] = SCENE_OPTIONS.map((option) => option.value);

const SCENE_LABELS: Record<string, string> = Object.fromEntries(
  SCENE_OPTIONS.map((option) => [option.value, option.label]),
);

/** Human labels for a place's scene values, in vocab order, skipping unknown values. */
export function sceneLabelsFor(place: Place): string[] {
  return SCENE_VALUES.filter((value) => sceneTypesForPlace(place).includes(value)).map(
    (value) => SCENE_LABELS[value],
  );
}

/** "Any" plus the six canonical light windows the Best light filter offers. */
export const LIGHT_OPTIONS = ["Any", "Golden hour", "Sunrise", "Sunset", "Blue hour", "Daylight", "Night"];

export const LIGHT_VALUES: string[] = LIGHT_OPTIONS.filter((option) => option !== "Any");

/**
 * Alias table used only as a fallback: how a free-form `bestTimes` entry maps onto the canonical
 * light vocab when a place somehow lacks the curated `bestLight` field.
 */
const LIGHT_ALIASES: Record<string, string[]> = {
  "Golden hour": ["golden hour", "sunrise", "sunset", "late afternoon"],
  Sunrise: ["sunrise", "morning"],
  Sunset: ["sunset", "late afternoon"],
  "Blue hour": ["blue hour", "night", "rainy evening"],
  Daylight: ["daylight", "morning", "afternoon", "clear", "overcast", "low tide", "rainy day"],
  Night: ["night"],
};

function lowerJoin(values: string[]): string {
  return values.join(" ").toLowerCase();
}

/** Curated scene values if present; otherwise derive from tags (values that are scene values). */
export function sceneTypesForPlace(place: Place): string[] {
  if (place.sceneTypes && place.sceneTypes.length) return place.sceneTypes;
  return place.tags.filter((tag) => SCENE_VALUES.includes(tag));
}

/** Curated best-light values if present; otherwise derive from the descriptive bestTimes. */
export function bestLightForPlace(place: Place): string[] {
  if (place.bestLight && place.bestLight.length) return place.bestLight;
  const text = lowerJoin(place.bestTimes);
  return LIGHT_VALUES.filter((value) =>
    (LIGHT_ALIASES[value] ?? [value.toLowerCase()]).some((alias) => text.includes(alias)),
  );
}

/** True when the place carries at least one of the selected scene values (empty selection = all). */
export function matchesSceneFilter(place: Place, sceneFilters: string[]): boolean {
  if (!sceneFilters.length) return true;
  const scenes = sceneTypesForPlace(place);
  return sceneFilters.some((filter) => scenes.includes(filter));
}

/** True when the place carries the selected light window ("Any" = all). */
export function matchesBestLightFilter(place: Place, lightFilter: string): boolean {
  if (lightFilter === "Any") return true;
  return bestLightForPlace(place).includes(lightFilter);
}
