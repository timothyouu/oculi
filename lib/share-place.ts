import type { Place } from "./types";

export function buildPlaceShareUrl(place: Place, origin: string): string {
  return `${origin}/places/${place.id}`;
}
