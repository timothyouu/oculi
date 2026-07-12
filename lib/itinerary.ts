import type { Place } from "./types";

// A single stop in the user-built saved itinerary. Unlike the old auto-planned
// shoot routes, an itinerary carries no light/arrival/duration flavor -- it is
// just the ordered list of places the user chose, plus the map-handoff URLs
// that let them open the stop (or the whole route) in Google/Apple Maps.
export type ItineraryStop = {
  place: Place;
  address: string;
  coordinateLabel: string;
  googleMapsUrl: string;
  appleMapsUrl: string;
};

// Street addresses for the seed San Francisco catalog. `Place.navigationAddress`
// is the source of truth when present; this map is a fallback for older rows,
// and `${name}, ${fuzzyLocationLabel}` is the last resort.
const placeAddresses: Record<string, string> = {
  "golden-gate-overlook": "Golden Gate Bridge Overlook, Lincoln Blvd, San Francisco, CA",
  "baker-beach": "Baker Beach, Battery Chamberlin Rd, San Francisco, CA",
  "palace-fine-arts": "Palace of Fine Arts, 3601 Lyon St, San Francisco, CA",
  "twin-peaks": "Twin Peaks, 501 Twin Peaks Blvd, San Francisco, CA",
  "lands-end": "Lands End Trail, 680 Point Lobos Ave, San Francisco, CA",
  "sutro-baths": "Sutro Baths, 1004 Point Lobos Ave, San Francisco, CA",
  embarcadero: "Ferry Building, 1 Ferry Building, San Francisco, CA",
  "dolores-park": "Mission Dolores Park, Dolores St & 19th St, San Francisco, CA",
  "painted-ladies": "Painted Ladies, Steiner St & Hayes St, San Francisco, CA",
  "battery-spencer": "Battery Spencer, Conzelman Rd, Sausalito, CA",
  "marshall-beach": "Marshall's Beach, Batteries to Bluffs Trail, San Francisco, CA",
  "fort-point": "Fort Point National Historic Site, Long Ave & Marine Dr, San Francisco, CA",
  "chrissy-field": "Chrissy Field East Beach, 1199 E Beach, San Francisco, CA",
  "coit-tower": "Coit Tower, 1 Telegraph Hill Blvd, San Francisco, CA",
  "salesforce-park": "Salesforce Park, 425 Mission St, San Francisco, CA",
  "chinatown-grant": "Grant Avenue, Chinatown, San Francisco, CA",
  "ocean-beach": "Ocean Beach, Great Hwy, San Francisco, CA",
  "bernal-heights": "Bernal Heights Park, 3400-3416 Folsom St, San Francisco, CA",
  "grace-cathedral": "Grace Cathedral, 1100 California St, San Francisco, CA",
  "mission-murals": "Clarion Alley Murals, Clarion Alley, San Francisco, CA",
};

export function itineraryAddressForPlace(place: Place): string {
  return place.navigationAddress ?? placeAddresses[place.id] ?? `${place.name}, ${place.fuzzyLocationLabel}`;
}

function encodeCoordinate(place: Place): string {
  return `${place.lat.toFixed(5)},${place.lng.toFixed(5)}`;
}

function googleStopUrl(place: Place): string {
  const query = encodeURIComponent(`${place.name} ${encodeCoordinate(place)}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function appleStopUrl(place: Place): string {
  const query = encodeURIComponent(`${place.name}`);
  return `https://maps.apple.com/?ll=${place.lat},${place.lng}&q=${query}`;
}

/**
 * Resolve stored itinerary place ids into ordered `Place` objects. Preserves
 * the user's chosen order, drops ids that no longer resolve to a known place,
 * and de-duplicates (a place can only appear in the itinerary once).
 */
export function resolveItineraryPlaces(itineraryPlaceIds: string[], places: Place[]): Place[] {
  const placesById = new Map(places.map((place) => [place.id, place]));
  const seen = new Set<string>();
  const resolved: Place[] = [];

  for (const placeId of itineraryPlaceIds) {
    if (seen.has(placeId)) continue;
    const place = placesById.get(placeId);
    if (!place) continue;
    seen.add(placeId);
    resolved.push(place);
  }

  return resolved;
}

export function buildItinerary(places: Place[]): ItineraryStop[] {
  return places.map((place) => ({
    place,
    address: itineraryAddressForPlace(place),
    coordinateLabel: encodeCoordinate(place),
    googleMapsUrl: googleStopUrl(place),
    appleMapsUrl: appleStopUrl(place),
  }));
}

/** A driving-directions URL through every itinerary stop, in order. */
export function itineraryGoogleMapsUrl(places: Place[]): string {
  if (!places.length) return "https://www.google.com/maps";

  const destination = places[places.length - 1];
  const waypoints = places.slice(0, -1).map((place) => `${place.lat},${place.lng}`);
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    destination: `${destination.lat},${destination.lng}`,
  });

  if (waypoints.length) params.set("waypoints", waypoints.join("|"));

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Apple Maps has no multi-waypoint URL scheme, so this heads to the first stop. */
export function itineraryAppleMapsUrl(places: Place[]): string {
  const firstStop = places[0];
  if (!firstStop) return "https://maps.apple.com";

  return `https://maps.apple.com/?daddr=${firstStop.lat},${firstStop.lng}&dirflg=d`;
}
