import { expect, type Page, test } from "@playwright/test";

// Guards the map camera persistence + cluster-click-zoom-progress regressions
// documented in CLAUDE.md (2026-07-09 entries): the camera position
// (`lib/storage.ts` `loadMapCameraView`/`saveMapCameraView`, key
// `oculi:map-camera`) must survive a reload via `jumpTo` instead of
// re-running "fit to all places", and clicking a cluster marker must always
// make visible zoom progress (falling back to a flat zoom step when the
// cluster's own bounds are degenerate at low zoom).
//
// Same reasoning as map-fallback.spec.ts: `app/api/mapbox/route.ts` already
// retries with a hardcoded `http://localhost:3000/` referrer on 401/403 for
// any localhost/127.0.0.1 request, so this runs against
// playwright.config.ts's own managed webServer rather than a second,
// manually-run dev server (two concurrent `next dev` processes here share
// one `.next` build directory and corrupt each other's chunks).
const CAMERA_KEY = "oculi:map-camera";

type MapCamera = { center: [number, number]; zoom: number; bearing: number; pitch: number };

async function readCamera(page: Page): Promise<MapCamera | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, CAMERA_KEY);
}

test.describe("map camera persistence and cluster zoom", () => {
  // Each test gets a fresh Playwright browser context, which already has
  // empty localStorage - that's enough isolation here. (An `addInitScript`
  // clear was tried and rejected: init scripts re-run on every navigation,
  // including `page.reload()`, so it was wiping the just-saved camera
  // immediately before the restore effect could read it back.)

  test("panning and zooming the live map persists the camera across reload", async ({ page }) => {
    // This test is network-bound end to end (live Mapbox tiles through the
    // /api/mapbox proxy, twice — initial load and reload) and was observed
    // running right at the default 30s budget: passing marginally on
    // 2026-07-10 and timing out mid-wheel-loop on 2026-07-11 with no code
    // change. Triple the budget; the assertions themselves are unchanged.
    test.slow();

    await page.goto("/map");

    const canvas = page.locator(".mapboxgl-canvas");
    await expect(canvas).toBeVisible({ timeout: 20_000 });

    // Wait for the initial "fit to all places" camera to settle and record it
    // as a baseline - we'll assert the post-interaction camera moved away
    // from this, and that reload restores that moved-away position exactly
    // (not a fresh fit-to-all jump back near the baseline).
    let baselineZoom = -Infinity;
    await expect
      .poll(
        async () => {
          const camera = await readCamera(page);
          baselineZoom = camera?.zoom ?? -Infinity;
          return camera !== null;
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    // Drive the map with real mouse input so mapbox-gl fires real moveend
    // events: a drag pan, then repeated wheel scrolls to zoom in (mapbox-gl's
    // default scrollZoom handler).
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(250, 200, { steps: 10 });
    await page.mouse.up();

    for (let i = 0; i < 10; i += 1) {
      await page.mouse.move(400, 300);
      await page.mouse.wheel(0, -200);
      await page.waitForTimeout(120);
    }

    // Deterministically cancel any still-in-flight wheel-zoom easing before
    // snapshotting: mapbox-gl stops camera animations whenever a new pointer
    // gesture begins, so a click on the canvas guarantees no further moveend
    // can fire after we read the camera. Without this, rAF starvation under
    // parallel test load stalls the easing long enough that the camera looks
    // settled, then the final easing tick persists a higher zoom during
    // reload teardown — the restore then (correctly) brings back a value the
    // test never saw (observed failing deterministically at HEAD on
    // 2026-07-11: captured 3.2196, restored 3.7901).
    // (A motionless down/up is not enough — the drag handler only engages,
    // and only then stops the camera animation, once the pointer moves.)
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(406, 306, { steps: 3 });
    await page.mouse.up();

    // Now wait for the zoom to clear the threshold AND hold steady across
    // two consecutive reads.
    let movedCamera: MapCamera | null = null;
    let previousZoom = -Infinity;
    await expect
      .poll(
        async () => {
          movedCamera = await readCamera(page);
          const zoom = movedCamera?.zoom ?? -Infinity;
          const settled = zoom > baselineZoom + 0.5 && zoom === previousZoom;
          previousZoom = zoom;
          return settled;
        },
        { timeout: 15_000, intervals: [500] },
      )
      .toBe(true);

    expect(movedCamera).not.toBeNull();
    const beforeReload = movedCamera!;

    await page.reload();
    await expect(page.locator(".mapboxgl-canvas")).toBeVisible({ timeout: 20_000 });

    // The restore is an instant `jumpTo` (not an animation), but still fires
    // a moveend that re-persists the same values - poll until it lands.
    let afterReload: MapCamera | null = null;
    await expect
      .poll(
        async () => {
          afterReload = await readCamera(page);
          return afterReload?.zoom ?? null;
        },
        { timeout: 15_000 },
      )
      .not.toBeNull();

    const restored = afterReload!;
    // No "fit to all" jump back toward the baseline: the restored camera
    // must match where we left it, not the original fit-to-all view.
    expect(restored.zoom).toBeCloseTo(beforeReload.zoom, 1);
    expect(restored.center[0]).toBeCloseTo(beforeReload.center[0], 3);
    expect(restored.center[1]).toBeCloseTo(beforeReload.center[1], 3);
  });

  test("clicking a cluster marker makes visible zoom progress", async ({ page }) => {
    await page.goto("/map");

    await expect(page.locator(".mapboxgl-canvas")).toBeVisible({ timeout: 20_000 });

    // Wait for the initial "fit to all places" to settle and record its zoom
    // as the baseline the cluster click must exceed.
    let baselineZoom: number | null = null;
    await expect
      .poll(
        async () => {
          const camera = await readCamera(page);
          baselineZoom = camera?.zoom ?? null;
          return baselineZoom;
        },
        { timeout: 15_000 },
      )
      .not.toBeNull();

    // A map marker (aria-label starts with "Select ") whose label mentions
    // "places" is a genuine multi-place cluster (see components/mapbox-map.tsx
    // marker labeling), so clicking it exercises the
    // cameraForBounds-vs-flat-zoom-step logic, not the lone-marker branch.
    // (The nav bar's unrelated "Open saved places, N saved" button also
    // contains " places" - the "Select " prefix excludes it.)
    const clusterMarker = page.locator('button[aria-label^="Select "][aria-label*=" places"]').first();
    await expect(clusterMarker).toBeVisible({ timeout: 15_000 });
    await clusterMarker.click();

    await expect
      .poll(
        async () => {
          const camera = await readCamera(page);
          return camera?.zoom ?? null;
        },
        { timeout: 15_000 },
      )
      .toBeGreaterThan(baselineZoom! + 0.1);
  });
});
