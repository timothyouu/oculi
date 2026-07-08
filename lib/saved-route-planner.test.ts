import { describe, expect, it } from "vitest";
import { photos, places } from "./data";
import {
  buildSavedRoutePlans,
  createShootRouteStop,
  rebuildShootRoutePlan,
} from "./saved-route-planner";

const savedPlaces = places.filter((place) =>
  ["golden-gate-overlook", "baker-beach", "battery-spencer", "twin-peaks"].includes(place.id),
);
const savedPhotos = photos.filter((photo) => savedPlaces.some((place) => place.id === photo.placeId));

describe("saved route planner", () => {
  it("builds morning and sunset plans from saved places with the expected stop limits", () => {
    const [morning, sunset] = buildSavedRoutePlans(savedPlaces, savedPhotos);

    expect(morning.id).toBe("morning");
    expect(morning.stops).toHaveLength(3);
    expect(morning.stops[0].arrivalLabel).toMatch(/6:10 AM/);
    expect(morning.stops.every((stop) => savedPlaces.includes(stop.place))).toBe(true);

    expect(sunset.id).toBe("sunset");
    expect(sunset.stops).toHaveLength(2);
    expect(sunset.stops[0].arrivalLabel).toMatch(/5:35 PM/);
    expect(sunset.stops.every((stop) => savedPlaces.includes(stop.place))).toBe(true);
  });

  it("prefers route-specific light signals", () => {
    const [morning, sunset] = buildSavedRoutePlans(savedPlaces, savedPhotos);

    expect(morning.stops.map((stop) => stop.place.bestTimes.join(" ").toLowerCase()).join(" ")).toContain("sunrise");
    expect(sunset.stops.map((stop) => stop.place.bestTimes.join(" ").toLowerCase()).join(" ")).toMatch(
      /sunset|golden hour|blue hour|late afternoon|night/,
    );
  });

  it("generates per-stop and full-route map handoff URLs without API calls", () => {
    const [morning] = buildSavedRoutePlans(savedPlaces, savedPhotos);
    const firstStop = morning.stops[0];
    const destination = morning.stops[morning.stops.length - 1].place;

    expect(firstStop.coordinateLabel).toMatch(/^-?\d+\.\d{5},-?\d+\.\d{5}$/);
    expect(firstStop.googleMapsUrl).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(firstStop.appleMapsUrl).toContain("https://maps.apple.com/?ll=");
    expect(morning.googleMapsUrl).toContain("https://www.google.com/maps/dir/?");
    expect(morning.googleMapsUrl).toContain(`destination=${encodeURIComponent(`${destination.lat},${destination.lng}`)}`);
    expect(morning.googleMapsUrl).toContain("waypoints=");
    expect(morning.appleMapsUrl).toContain("https://maps.apple.com/?daddr=");
  });

  it("rebuilds edited plans with updated full-route map URLs", () => {
    const bakerBeach = places.find((place) => place.id === "baker-beach");
    const goldenGate = places.find((place) => place.id === "golden-gate-overlook");
    expect(bakerBeach).toBeDefined();
    expect(goldenGate).toBeDefined();

    const editedStops = [
      createShootRouteStop("sunset", bakerBeach!, [], 0),
      createShootRouteStop("sunset", goldenGate!, [], 1),
    ];
    const plan = rebuildShootRoutePlan("sunset", editedStops);

    expect(plan.stops.map((stop) => stop.place.id)).toEqual(["baker-beach", "golden-gate-overlook"]);
    expect(plan.googleMapsUrl).toContain(`destination=${encodeURIComponent(`${goldenGate!.lat},${goldenGate!.lng}`)}`);
    expect(plan.googleMapsUrl).toContain(`waypoints=${encodeURIComponent(`${bakerBeach!.lat},${bakerBeach!.lng}`)}`);
    expect(plan.appleMapsUrl).toContain(`daddr=${bakerBeach!.lat},${bakerBeach!.lng}`);
  });
});
