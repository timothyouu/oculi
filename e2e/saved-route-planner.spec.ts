import { expect, type Page, type Locator, test } from "@playwright/test";

// Guards the shoot-day route planner on /saved (components/saved-panel.tsx,
// lib/saved-route-planner.ts). Rewritten 2026-07-10: the drag-reorder
// refactor (touch/mouse pointer dragging on each stop row, see
// RoutePlanCard/RouteStopRow in saved-panel.tsx) replaced the old
// "Move up"/"Move down" buttons, and the old "Add saved place to route"
// <select> was replaced by a horizontally-scrolling tile rail of buttons
// (aria-label "Add saved places to route", one button per not-yet-added
// saved place). This spec exercises the current UI: entering edit mode,
// adding a stop from the tile rail, reordering via a real pointer drag,
// pinning a stop, regenerating, and saving the plan -- the same depth of
// coverage the old spec had, just against the real interaction model.
//
// Also aligned with the 2026-07-10 per-user-relations migration
// (docs/demo-to-product-audit.md item 6, 20260710000600_normalize_user_relations.sql):
// savedPlaceIds now lives in its own `saved_places` table, not the
// `oculi_demo_states` JSON blob, so this mock seeds `saved_places` directly
// (same pattern as e2e/saved-roundtrip.spec.ts) instead of embedding
// savedPlaceIds in the state blob.

type DemoState = {
  followedUserIds: string[];
  likedPhotoIds: string[];
  viewedPhotoIds: string[];
  viewedPlaceIds: string[];
  placeViews: Array<{ placeId: string; viewedAt: string; viewCount: number }>;
  lastViewedPlaceId?: string;
  lastDiscoveryPlaceId?: string;
  discoveryActiveIndex: number;
  uploadedPhotos: unknown[];
};

function createInitialState(): DemoState {
  return {
    followedUserIds: ["user-maya", "user-eli"],
    likedPhotoIds: [],
    viewedPhotoIds: [],
    viewedPlaceIds: [],
    placeViews: [],
    lastViewedPlaceId: undefined,
    lastDiscoveryPlaceId: undefined,
    discoveryActiveIndex: 0,
    uploadedPhotos: [],
  };
}

async function mockSavedPlannerSupabase(page: Page) {
  let persistedState = createInitialState();
  let savedPlaceIds = ["golden-gate-overlook", "baker-beach", "battery-spencer", "twin-peaks"];
  const routePlanInserts: unknown[] = [];
  const routeStopInserts: unknown[] = [];

  await page.route("**/rest/v1/oculi_demo_states**", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ state: persistedState }),
      });
      return;
    }

    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() ?? "{}") as { state: DemoState };
      persistedState = body.state;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([body]),
      });
      return;
    }

    await route.fulfill({ status: 204 });
  });

  await page.route("**/rest/v1/saved_places**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(savedPlaceIds.map((placeId) => ({ place_id: placeId }))),
      });
      return;
    }

    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() ?? "{}") as { place_id?: string };
      if (body.place_id && !savedPlaceIds.includes(body.place_id)) {
        savedPlaceIds = [...savedPlaceIds, body.place_id];
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([body]),
      });
      return;
    }

    if (request.method() === "DELETE") {
      const placeIdParam = url.searchParams.get("place_id");
      const placeId = placeIdParam?.replace(/^eq\./, "");
      if (placeId) savedPlaceIds = savedPlaceIds.filter((id) => id !== placeId);
      await route.fulfill({ status: 204 });
      return;
    }

    await route.fulfill({ status: 204 });
  });

  // Not exercised by this spec, but must still be intercepted -- the
  // Playwright webServer's NEXT_PUBLIC_SUPABASE_URL points at a
  // non-existent local stack, so leaving these unmocked stalls the
  // bootstrap Promise.all instead of failing fast (see saved-roundtrip.spec.ts).
  for (const table of ["followed_users", "liked_photos", "viewed_photos"]) {
    await page.route(`**/rest/v1/${table}**`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        return;
      }
      await route.fulfill({ status: 204 });
    });
  }

  await page.route("**/rest/v1/rpc/place_save_counts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route("**/rest/v1/oculi_demo_catalog_items**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route("**/rest/v1/photos**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fulfill({ status: 204 });
  });

  await page.route("**/rest/v1/route_plans**", async (route) => {
    const request = route.request();

    if (request.method() === "POST") {
      routePlanInserts.push(JSON.parse(request.postData() ?? "{}"));
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "playwright-route-plan" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });

  await page.route("**/rest/v1/route_plan_stops**", async (route) => {
    const request = route.request();

    if (request.method() === "POST") {
      routeStopInserts.push(JSON.parse(request.postData() ?? "[]"));
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: "[]",
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });

  return { routePlanInserts, routeStopInserts };
}

// The reorder mechanism is a real pointer/mouse drag (saved-panel.tsx's
// RoutePlanCard tracks mousedown/mousemove/mouseup and hit-tests
// document.elementFromPoint against each row's data-route-stop-id), not a
// button -- so the drag has to be driven with real mouse coordinates for
// the component's own hit-testing to pick it up, same as a real user.
async function dragStopRowOnto(page: Page, fromRow: Locator, ontoRow: Locator) {
  const fromBox = await fromRow.boundingBox();
  const ontoBox = await ontoRow.boundingBox();
  if (!fromBox || !ontoBox) throw new Error("Could not measure route stop rows for drag.");

  // Grab near the top of the card (the index badge / title), away from the
  // Copy/Google/Apple/Pin/Remove buttons lower in the card -- mousedown on
  // an interactive descendant is intentionally ignored by the component
  // (isInteractiveDragTarget) so a real drag has to start on plain card chrome.
  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + 20);
  await page.mouse.down();
  await page.mouse.move(ontoBox.x + ontoBox.width / 2, ontoBox.y + ontoBox.height / 2, { steps: 10 });
  await page.mouse.up();
}

test("edits and saves a generated route plan from the Saved page", async ({ page }) => {
  const supabase = await mockSavedPlannerSupabase(page);

  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "Saved places" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plan a shoot day" })).toBeVisible();
  await expect(page.getByLabel(/Map preview|Live Mapbox map/)).toBeVisible();

  await page.getByLabel("Edit stops").click();

  const addStopRail = page.getByLabel("Add saved places to route");
  await expect(addStopRail).toBeVisible();

  // Click first, then learn WHICH place got added from the status message.
  // Reading the first tile's name and clicking as two separate steps raced
  // the bootstrap re-render (the rail can reorder between the read and the
  // click under load — observed 2026-07-11: captured "Coit Tower" but the
  // click landed on "Baker Beach"). The status text is written from the
  // exact place the click handler added, so it's the trustworthy source.
  await addStopRail.getByRole("button").first().click();
  const addedStatus = page.getByText(/Added .+ to Morning route\./);
  await expect(addedStatus).toBeVisible();
  const addedPlaceName = (await addedStatus.textContent())
    ?.replace(/^Added /, "")
    .replace(/ to Morning route\.$/, "")
    .trim();
  expect(addedPlaceName).toBeTruthy();

  // Confirm the added place is actually a saved place, not just an
  // arbitrary label -- it must have disappeared from the "still addable"
  // rail (it's now a stop) and appear as a route stop row.
  const stopRows = page.locator("[data-route-stop-id]");
  await expect(stopRows.filter({ hasText: addedPlaceName! })).toHaveCount(1);

  const stopIdsBefore = await stopRows.evaluateAll((rows) => rows.map((row) => row.getAttribute("data-route-stop-id")));
  expect(stopIdsBefore.length).toBeGreaterThanOrEqual(3);

  await page.getByRole("button", { name: /Pin/ }).first().click();
  await expect(page.getByText("Updated pinned stops for this route.")).toBeVisible();

  // Drag the first stop onto the second and confirm the planner actually
  // reordered its data model, not just fired the status message. An
  // adjacent swap is asserted exactly: longer drags reorder incrementally
  // as rows shift under the cursor mid-drag (real drag-and-drop behavior),
  // so only the neighbor swap has a deterministic final order.
  await dragStopRowOnto(page, stopRows.nth(0), stopRows.nth(1));
  await expect(page.getByText("Reordered route stops.")).toBeVisible();

  const stopIdsAfter = await stopRows.evaluateAll((rows) => rows.map((row) => row.getAttribute("data-route-stop-id")));
  expect(stopIdsAfter).toEqual([
    stopIdsBefore[1],
    stopIdsBefore[0],
    ...stopIdsBefore.slice(2),
  ]);

  await page.getByRole("button", { name: "Regenerate route" }).click();
  await expect(page.getByText(/Regenerated route/)).toBeVisible();

  await page.getByRole("button", { name: "Save route plan" }).click();
  await expect(page.getByText("Saved Morning route plan.")).toBeVisible();

  expect(supabase.routePlanInserts).toHaveLength(1);
  expect(supabase.routeStopInserts).toHaveLength(1);
  expect(supabase.routePlanInserts[0]).toMatchObject({
    kind: "morning",
    name: expect.stringContaining("Morning route"),
  });
  expect(supabase.routeStopInserts[0]).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        route_plan_id: "playwright-route-plan",
        place_id: expect.any(String),
        position: expect.any(Number),
      }),
    ]),
  );
});
