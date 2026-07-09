import { describe, expect, it } from "vitest";
import { haversineDistanceKm, sortByDistanceFrom } from "./geo";

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
