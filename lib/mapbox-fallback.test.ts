import { describe, expect, it } from "vitest";
import { shouldFallbackToStylizedMap } from "./mapbox-fallback";

describe("shouldFallbackToStylizedMap", () => {
  it("keeps the live map when a token is present and there is no auth failure", () => {
    expect(
      shouldFallbackToStylizedMap({ requireMapbox: false, hasAccessToken: true, unauthorized: false }),
    ).toBe(false);
  });

  it("keeps the live map through transient errors (unauthorized stays false)", () => {
    // Regression guard: a stray Mapbox GL error event must NOT tear the map down.
    expect(
      shouldFallbackToStylizedMap({ requireMapbox: false, hasAccessToken: true, unauthorized: false }),
    ).toBe(false);
  });

  it("falls back only on a confirmed auth rejection (401/403)", () => {
    expect(
      shouldFallbackToStylizedMap({ requireMapbox: false, hasAccessToken: true, unauthorized: true }),
    ).toBe(true);
  });

  it("falls back when there is no access token", () => {
    expect(
      shouldFallbackToStylizedMap({ requireMapbox: false, hasAccessToken: false, unauthorized: false }),
    ).toBe(true);
  });

  it("never falls back when Mapbox is required, even if unauthorized", () => {
    expect(
      shouldFallbackToStylizedMap({ requireMapbox: true, hasAccessToken: true, unauthorized: true }),
    ).toBe(false);
    expect(
      shouldFallbackToStylizedMap({ requireMapbox: true, hasAccessToken: false, unauthorized: false }),
    ).toBe(false);
  });
});
