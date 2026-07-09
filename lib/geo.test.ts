import { describe, expect, it } from "vitest";
import { haversineDistanceKm, nearbyPlaces, sortByDistanceFrom } from "./geo";

describe("haversineDistanceKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistanceKm({ lat: 37.8, lng: -122.4 }, { lat: 37.8, lng: -122.4 })).toBe(0);
  });

  it("matches the known San Francisco to Los Angeles distance (~560km)", () => {
    const sf = { lat: 37.7749, lng: -122.4194 };
    const la = { lat: 34.0522, lng: -118.2437 };
    const distance = haversineDistanceKm(sf, la);
    expect(distance).toBeGreaterThan(550);
    expect(distance).toBeLessThan(570);
  });
});

describe("sortByDistanceFrom", () => {
  it("orders items nearest-first without mutating the input array", () => {
    const origin = { lat: 0, lng: 0 };
    const far = { lat: 10, lng: 10, id: "far" };
    const near = { lat: 0.1, lng: 0.1, id: "near" };
    const items = [far, near];

    const sorted = sortByDistanceFrom(origin, items);

    expect(sorted.map((item) => item.id)).toEqual(["near", "far"]);
    expect(items).toEqual([far, near]);
  });
});

describe("nearbyPlaces", () => {
  // A tight San Francisco cluster plus one far-away Tokyo spot.
  const goldenGate = { lat: 37.8199, lng: -122.4783, id: "golden-gate" };
  const ferryBuilding = { lat: 37.7955, lng: -122.3937, id: "ferry-building" };
  const twinPeaks = { lat: 37.7544, lng: -122.4477, id: "twin-peaks" };
  const shibuya = { lat: 35.6595, lng: 139.7005, id: "shibuya" };
  const sfCluster = [goldenGate, ferryBuilding, twinPeaks, shibuya];

  it("returns the nearest place first as the anchor", () => {
    const nearFerry = { lat: 37.79, lng: -122.4 };
    expect(nearbyPlaces(nearFerry, sfCluster)[0]?.id).toBe("ferry-building");
  });

  it("brings up the surrounding-area nodes but excludes far-away spots", () => {
    const nearGoldenGate = { lat: 37.82, lng: -122.47 };
    const ids = nearbyPlaces(nearGoldenGate, sfCluster).map((place) => place.id);

    expect(ids).toContain("golden-gate");
    expect(ids).toContain("ferry-building");
    expect(ids).toContain("twin-peaks");
    // Tokyo is thousands of km away, so it's not part of the SF surroundings.
    expect(ids).not.toContain("shibuya");
  });

  it("caps the number of surfaced nodes", () => {
    const dense = Array.from({ length: 20 }, (_, index) => ({
      lat: 37.8 + index * 0.001,
      lng: -122.4,
      id: `p${index}`,
    }));
    expect(nearbyPlaces({ lat: 37.8, lng: -122.4 }, dense, { maxCount: 6 })).toHaveLength(6);
  });

  it("falls back to the nearest items when the anchor is isolated", () => {
    // Only the anchor is inside the radius, so it tops up to nearest-first.
    const origin = { lat: 35.66, lng: 139.7 };
    const result = nearbyPlaces(origin, sfCluster, { radiusKm: 10, maxCount: 3 });
    expect(result[0]?.id).toBe("shibuya");
    expect(result.length).toBeGreaterThan(1);
  });

  it("returns an empty array when there are no places", () => {
    expect(nearbyPlaces({ lat: 0, lng: 0 }, [])).toEqual([]);
  });
});
