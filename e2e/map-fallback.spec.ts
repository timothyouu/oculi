import { expect, test } from "@playwright/test";

// This spec exercises the live Mapbox map / stylized-fallback decision
// (`lib/mapbox-fallback.ts` `shouldFallbackToStylizedMap`, see CLAUDE.md's
// 2026-07-08 regression entry: transient Mapbox GL `error` events must NOT
// tear the live map down; only a confirmed 401/403 auth rejection should).
//
// The Mapbox token here is referrer-restricted to `localhost:3000`, but
// `app/api/mapbox/route.ts` already retries with a hardcoded
// `http://localhost:3000/` referrer on 401/403 whenever the request's own
// hostname is `localhost`/`127.0.0.1` - regardless of port. So this runs
// against playwright.config.ts's own managed `webServer`
// (127.0.0.1:PORT, `page.goto("/map")`) like every other spec, instead of a
// second manually-run dev server on port 3000: two concurrent `next dev`
// processes in this repo share one `.next` build directory and corrupt each
// other's chunks (observed directly - the /map route's client bundle 404'd
// intermittently whenever a second dev server was running).
test.describe("map live/fallback rendering", () => {
  test("renders the live Mapbox map (not the stylized fallback) when a token is present", async ({ page }) => {
    await page.goto("/map");

    await expect(page.getByLabel("Live Mapbox map")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".mapboxgl-canvas")).toBeVisible({ timeout: 20_000 });

    // The stylized fallback must not be present alongside (or instead of) the live map.
    await expect(page.getByLabel("Map preview")).toHaveCount(0);
  });

  test("blocking the Mapbox proxy with 403s flips to the stylized fallback", async ({ page }) => {
    // `components/mapbox-map.tsx` proxies every Mapbox request (tiles, style,
    // and its own tile-health-check fetch) through `/api/mapbox`. Forcing
    // every proxied request to 403 simulates a confirmed auth rejection,
    // which is the one case `shouldFallbackToStylizedMap` says must fall
    // back to `StylizedMap` (unlike transient/cosmetic GL errors).
    await page.route("**/api/mapbox**", (route) =>
      route.fulfill({ status: 403, contentType: "text/plain", body: "Forbidden" }),
    );

    await page.goto("/map");

    await expect(page.getByLabel("Map preview")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".mapboxgl-canvas")).toHaveCount(0);
    await expect(page.getByLabel("Live Mapbox map")).toHaveCount(0);
  });
});
