import type { Area, Place } from "./types";

export function formatPlaceLocation(place: Place, areas: Area[]) {
  const area = areas.find((item) => item.id === place.areaId);
  if (!area) return place.fuzzyLocationLabel;

  return `${area.name}, ${area.region}`;
}
