import { describe, expect, it } from "vitest";
import { places } from "./data";
import {
  buildItinerary,
  itineraryAddressForPlace,
  itineraryAppleMapsUrl,
  itineraryGoogleMapsUrl,
  resolveItineraryPlaces,
} from "./itinerary";

const orderedIds = ["twin-peaks", "baker-beach", "golden-gate-overlook"];

describe("itinerary", () => {
  it("resolves stored ids into places preserving the user's order", () => {
    const resolved = resolveItineraryPlaces(orderedIds, places);
    expect(resolved.map((place) => place.id)).toEqual(orderedIds);
  });

  it("drops unknown ids and de-duplicates repeats", () => {
    const resolved = resolveItineraryPlaces(
      ["twin-peaks", "not-a-real-place", "twin-peaks", "baker-beach"],
      places,
    );
    expect(resolved.map((place) => place.id)).toEqual(["twin-peaks", "baker-beach"]);
  });

  it("returns an empty list when nothing resolves", () => {
    expect(resolveItineraryPlaces(["ghost", "phantom"], places)).toEqual([]);
    expect(resolveItineraryPlaces([], places)).toEqual([]);
  });

  it("builds stops with coordinate labels and per-stop map handoff URLs", () => {
    const stops = buildItinerary(resolveItineraryPlaces(orderedIds, places));

    expect(stops).toHaveLength(3);
    expect(stops[0].coordinateLabel).toMatch(/^-?\d+\.\d{5},-?\d+\.\d{5}$/);
    expect(stops[0].googleMapsUrl).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(stops[0].appleMapsUrl).toContain("https://maps.apple.com/?ll=");
    expect(stops[0].address).toBe(itineraryAddressForPlace(stops[0].place));
  });

  it("prefers navigationAddress, then the fallback map, then a composed label", () => {
    const twinPeaks = places.find((place) => place.id === "twin-peaks")!;
    expect(itineraryAddressForPlace(twinPeaks)).toBe(twinPeaks.navigationAddress);

    const withoutAddress = { ...twinPeaks, navigationAddress: undefined };
    expect(itineraryAddressForPlace(withoutAddress)).toBe(
      "Twin Peaks, 501 Twin Peaks Blvd, San Francisco, CA",
    );

    const unknown = {
      ...twinPeaks,
      id: "mystery-spot",
      name: "Mystery Spot",
      fuzzyLocationLabel: "Somewhere, CA",
      navigationAddress: undefined,
    };
    expect(itineraryAddressForPlace(unknown)).toBe("Mystery Spot, Somewhere, CA");
  });

  it("builds a full-route google directions url with waypoints in order", () => {
    const itineraryPlaces = resolveItineraryPlaces(orderedIds, places);
    const destination = itineraryPlaces[itineraryPlaces.length - 1];
    const url = itineraryGoogleMapsUrl(itineraryPlaces);

    expect(url).toContain("https://www.google.com/maps/dir/?");
    expect(url).toContain(`destination=${encodeURIComponent(`${destination.lat},${destination.lng}`)}`);
    expect(url).toContain("waypoints=");
  });

  it("routes apple maps to the first stop and degrades safely when empty", () => {
    const itineraryPlaces = resolveItineraryPlaces(orderedIds, places);
    const first = itineraryPlaces[0];

    expect(itineraryAppleMapsUrl(itineraryPlaces)).toContain(`daddr=${first.lat},${first.lng}`);
    expect(itineraryAppleMapsUrl([])).toBe("https://maps.apple.com");
    expect(itineraryGoogleMapsUrl([])).toBe("https://www.google.com/maps");
  });
});
