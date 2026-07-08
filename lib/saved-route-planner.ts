import type { Photo, Place } from "./types";

export type ShootRouteKind = "morning" | "sunset";

export type ShootRouteStop = {
  place: Place;
  address: string;
  coordinateLabel: string;
  arrivalLabel: string;
  durationLabel: string;
  note: string;
  score: number;
  googleMapsUrl: string;
  appleMapsUrl: string;
};

export type ShootRoutePlan = {
  id: ShootRouteKind;
  title: string;
  eyebrow: string;
  summary: string;
  confidenceText: string;
  stops: ShootRouteStop[];
  googleMapsUrl: string;
  appleMapsUrl: string;
};

const routeMetadata: Record<ShootRouteKind, Pick<ShootRoutePlan, "title" | "eyebrow">> = {
  morning: {
    title: "Morning route",
    eyebrow: "Sunrise / fog",
  },
  sunset: {
    title: "Sunset route",
    eyebrow: "Golden hour",
  },
};

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

const morningAliases = ["sunrise", "morning", "fog", "foggy", "daylight"];
const sunsetAliases = ["sunset", "golden hour", "blue hour", "late afternoon", "night"];

const morningArrivals = ["Arrive 6:10 AM", "Arrive 7:05 AM", "Arrive 8:10 AM"];
const sunsetArrivals = ["Arrive 5:35 PM", "Arrive 6:45 PM", "Arrive 7:35 PM"];

function normalizedText(place: Place, photos: Photo[]) {
  return [
    place.name,
    place.description,
    place.fuzzyLocationLabel,
    place.bestTimes.join(" "),
    place.tags.join(" "),
    ...photos.flatMap((photo) => [photo.caption, photo.locationLabel, photo.metadataText ?? "", photo.shotAtTimeOfDay ?? "", photo.tags.join(" ")]),
  ]
    .join(" ")
    .toLowerCase();
}

function routeScore(kind: ShootRouteKind, place: Place, photos: Photo[]) {
  const text = normalizedText(place, photos);
  const aliases = kind === "morning" ? morningAliases : sunsetAliases;
  const lightScore = aliases.reduce((score, alias) => score + (text.includes(alias) ? 42 : 0), 0);
  const activityScore = place.recentActivityScore * 1.3 + place.saveCount / 18;
  const photoScore = photos.length * 18;
  const curationScore = place.timCurated ? 24 : 0;
  const accessibilityPenalty = text.includes("difficult") || text.includes("low tide") ? 8 : 0;

  return lightScore + activityScore + photoScore + curationScore - accessibilityPenalty;
}

function routeNote(kind: ShootRouteKind, place: Place) {
  const text = `${place.bestTimes.join(" ")} ${place.tags.join(" ")} ${place.description}`.toLowerCase();

  if (kind === "morning") {
    if (text.includes("fog")) return "Best when fog starts breaking; keep the first stop flexible.";
    if (text.includes("architecture") || text.includes("portraits")) return "Soft early light keeps portraits and stone detail clean.";
    if (text.includes("skyline")) return "Arrive before glare builds over the city layers.";
    return "Picked for calmer crowds and gentle early light.";
  }

  if (text.includes("beach") || text.includes("coast")) return "Check tide and wind before leaving; sunset color changes quickly.";
  if (text.includes("skyline")) return "Stay through blue hour for city lights and layered haze.";
  if (text.includes("bridge")) return "Golden-hour compression works best from the public overlook edge.";
  return "Picked for warm late light and recent saved-photo activity.";
}

function encodeCoordinate(place: Place) {
  return `${place.lat.toFixed(5)},${place.lng.toFixed(5)}`;
}

function addressForPlace(place: Place) {
  return place.navigationAddress ?? placeAddresses[place.id] ?? `${place.name}, ${place.fuzzyLocationLabel}`;
}

function googleStopUrl(place: Place) {
  const query = encodeURIComponent(`${place.name} ${encodeCoordinate(place)}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function appleStopUrl(place: Place) {
  const query = encodeURIComponent(`${place.name}`);
  return `https://maps.apple.com/?ll=${place.lat},${place.lng}&q=${query}`;
}

function googleRouteUrl(stops: ShootRouteStop[]) {
  if (!stops.length) return "https://www.google.com/maps";

  const destination = stops[stops.length - 1].place;
  const waypointPlaces = stops.slice(0, -1).map((stop) => `${stop.place.lat},${stop.place.lng}`);
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    destination: `${destination.lat},${destination.lng}`,
  });

  if (waypointPlaces.length) params.set("waypoints", waypointPlaces.join("|"));

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function appleRouteUrl(stops: ShootRouteStop[]) {
  const firstStop = stops[0]?.place;
  if (!firstStop) return "https://maps.apple.com";

  return `https://maps.apple.com/?daddr=${firstStop.lat},${firstStop.lng}&dirflg=d`;
}

function pickRoutePlaces(kind: ShootRouteKind, savedPlaces: Place[], savedPhotos: Photo[], limit: number) {
  const photosByPlace = savedPhotos.reduce<Record<string, Photo[]>>((groups, photo) => {
    groups[photo.placeId] = [...(groups[photo.placeId] ?? []), photo];
    return groups;
  }, {});

  return savedPlaces
    .map((place) => ({
      place,
      score: routeScore(kind, place, photosByPlace[place.id] ?? []),
    }))
    .sort((a, b) => b.score - a.score || b.place.saveCount - a.place.saveCount)
    .slice(0, limit);
}

function buildStops(kind: ShootRouteKind, savedPlaces: Place[], savedPhotos: Photo[], limit: number) {
  const arrivals = kind === "morning" ? morningArrivals : sunsetArrivals;

  return pickRoutePlaces(kind, savedPlaces, savedPhotos, limit).map(({ place, score }, index) => ({
    place,
    address: addressForPlace(place),
    coordinateLabel: encodeCoordinate(place),
    arrivalLabel: arrivals[index] ?? arrivals[arrivals.length - 1],
    durationLabel: index === 0 ? "Start here" : index === 1 ? "45 min window" : "35 min window",
    note: routeNote(kind, place),
    score,
    googleMapsUrl: googleStopUrl(place),
    appleMapsUrl: appleStopUrl(place),
  }));
}

export function createShootRouteStop(kind: ShootRouteKind, place: Place, photos: Photo[], index: number): ShootRouteStop {
  const arrivals = kind === "morning" ? morningArrivals : sunsetArrivals;

  return {
    place,
    address: addressForPlace(place),
    coordinateLabel: encodeCoordinate(place),
    arrivalLabel: arrivals[index] ?? arrivals[arrivals.length - 1],
    durationLabel: index === 0 ? "Start here" : index === 1 ? "45 min window" : "35 min window",
    note: routeNote(kind, place),
    score: routeScore(kind, place, photos),
    googleMapsUrl: googleStopUrl(place),
    appleMapsUrl: appleStopUrl(place),
  };
}

export function rebuildShootRoutePlan(kind: ShootRouteKind, stops: ShootRouteStop[]): ShootRoutePlan {
  const metadata = routeMetadata[kind];

  return {
    id: kind,
    title: metadata.title,
    eyebrow: metadata.eyebrow,
    summary:
      kind === "morning"
        ? `${stops.length || 0} stop${stops.length === 1 ? "" : "s"} before the city gets busy`
        : `${stops.length || 0} stop${stops.length === 1 ? "" : "s"} for late light and blue hour`,
    confidenceText:
      kind === "morning"
        ? "Picked from saved places with Sunrise, Morning, Fog, distance, and recent photo activity."
        : "Picked from saved places with Sunset, Golden hour, Blue hour, coastal/skyline tags, and saved-photo activity.",
    stops,
    googleMapsUrl: googleRouteUrl(stops),
    appleMapsUrl: appleRouteUrl(stops),
  };
}

export function buildSavedRoutePlans(savedPlaces: Place[], savedPhotos: Photo[]): ShootRoutePlan[] {
  const morningStops = buildStops("morning", savedPlaces, savedPhotos, 3);
  const sunsetStops = buildStops("sunset", savedPlaces, savedPhotos, 2);

  return [
    rebuildShootRoutePlan("morning", morningStops),
    rebuildShootRoutePlan("sunset", sunsetStops),
  ];
}
