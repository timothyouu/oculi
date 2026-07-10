export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const KM_PER_MILE = 1.609344;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Converts kilometers to miles -- used to display real distance-to-place
 * stats (docs/demo-to-product-audit.md item 7) in the imperial units the
 * rest of the app's demo copy already uses ("0.3 mi"). */
export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

export function sortByDistanceFrom<T extends LatLng>(origin: LatLng, items: T[]): T[] {
  return [...items].sort(
    (a, b) => haversineDistanceKm(origin, a) - haversineDistanceKm(origin, b),
  );
}

export type NearbyPlacesOptions = {
  /** Places within this many km of the nearest one count as its surrounding area. */
  radiusKm?: number;
  /** Cap on how many nodes to surface, so the camera never zooms out to the whole globe. */
  maxCount?: number;
};

/**
 * Resolve the cluster of nodes to bring up for "Near me": the item closest to
 * `origin` (the anchor) followed by the other items around it. "Around it" means
 * within `radiusKm` of the anchor — i.e. the same metro/neighborhood — not merely
 * the next-closest items to the user, which could be on another continent. If the
 * anchor is isolated (nothing else within the radius), fall back to the nearest
 * `maxCount` items to the origin so the map still fits more than a single pin.
 *
 * The anchor is always returned first, so callers can select it as the focused place.
 */
export function nearbyPlaces<T extends LatLng>(
  origin: LatLng,
  items: T[],
  { radiusKm = 60, maxCount = 6 }: NearbyPlacesOptions = {},
): T[] {
  if (!items.length) return [];

  const anchor = sortByDistanceFrom(origin, items)[0];
  const aroundAnchor = sortByDistanceFrom(anchor, items);
  const withinRadius = aroundAnchor.filter((item) => haversineDistanceKm(anchor, item) <= radiusKm);
  const chosen = withinRadius.length >= 2 ? withinRadius : aroundAnchor;

  return chosen.slice(0, Math.max(1, maxCount));
}
