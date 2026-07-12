import { expect, type Page, type Locator, test } from "@playwright/test";

// Guards the saved-page itinerary (components/saved-panel.tsx, lib/itinerary.ts).
// Replaces the old auto-generated "shoot day" route planner (removed 2026-07-12):
// the /saved aside is now a plain, user-built itinerary list -- no morning/sunset
// tabs, no sunrise/fog flavor. Users add their own saved places two ways: the
// "Add" button in the itinerary (opens a dialog of saved places), and a
// three-dots menu on each saved-place card. The itinerary order persists in the
// oculi_demo_states JSON blob (itineraryPlaceIds), not a relation table.
//
// savedPlaceIds lives in its own `saved_places` table (2026-07-10 migration), so
// this mock seeds it directly, same pattern as e2e/saved-roundtrip.spec.ts.

type DemoState = {
  itineraryPlaceIds?: string[];
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
    itineraryPlaceIds: [],
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

async function mockSavedSupabase(page: Page) {
  const store = { persistedState: createInitialState() };
  let savedPlaceIds = ["golden-gate-overlook", "baker-beach", "battery-spencer", "twin-peaks"];

  await page.route("**/rest/v1/oculi_demo_states**", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ state: store.persistedState }),
      });
      return;
    }

    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() ?? "{}") as { state: DemoState };
      store.persistedState = body.state;
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
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify([body]) });
      return;
    }

    if (request.method() === "DELETE") {
      const placeId = url.searchParams.get("place_id")?.replace(/^eq\./, "");
      if (placeId) savedPlaceIds = savedPlaceIds.filter((id) => id !== placeId);
      await route.fulfill({ status: 204 });
      return;
    }

    await route.fulfill({ status: 204 });
  });

  // The Playwright webServer's NEXT_PUBLIC_SUPABASE_URL points at a non-existent
  // local stack, so every table the bootstrap Promise.all touches must be
  // intercepted or it stalls instead of failing fast (see saved-roundtrip.spec.ts).
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

  return store;
}

function itineraryStopRows(page: Page): Locator {
  return page.locator("[data-itinerary-stop-id]");
}

test("builds a user-picked itinerary from saved places with no auto route flavor", async ({ page }) => {
  const store = await mockSavedSupabase(page);

  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "Saved places" })).toBeVisible();

  // The itinerary panel replaced the old shoot-day route planner entirely.
  await expect(page.getByRole("heading", { name: "Itinerary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plan a shoot day" })).toHaveCount(0);
  await expect(page.getByText("Morning route")).toHaveCount(0);
  await expect(page.getByText("Sunrise / fog")).toHaveCount(0);
  await expect(page.getByLabel(/Map preview|Live Mapbox map/)).toBeVisible();

  // Starts empty.
  await expect(itineraryStopRows(page)).toHaveCount(0);
  await expect(page.getByText("Your itinerary is empty.", { exact: false })).toBeVisible();

  // --- Add via the itinerary "Add" button -> dialog of saved places ---
  await page.getByRole("button", { name: "Add saved place to itinerary" }).click();
  const dialog = page.getByRole("dialog", { name: "Add saved places to itinerary" });
  await expect(dialog).toBeVisible();

  // Every seeded saved place should be addable.
  await expect(dialog.getByRole("button", { name: /Add .+ to itinerary/ })).toHaveCount(4);

  await dialog.getByRole("button", { name: "Add Twin Peaks to itinerary" }).click();
  // Adding removes it from the dialog's remaining options.
  await expect(dialog.getByRole("button", { name: /Add .+ to itinerary/ })).toHaveCount(3);
  await page.getByRole("button", { name: "Close add-to-itinerary dialog" }).click();
  await expect(dialog).toHaveCount(0);

  const rows = itineraryStopRows(page);
  await expect(rows).toHaveCount(1);
  await expect(rows.filter({ hasText: "Twin Peaks" })).toHaveCount(1);

  // --- Add via a saved-place card's three-dots menu ---
  const bakerCard = page.locator("article", { hasText: "Baker Beach" }).first();
  await bakerCard.getByRole("button", { name: "More actions for Baker Beach" }).click();
  await page.getByRole("menuitem", { name: "Add to itinerary" }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Baker Beach" })).toHaveCount(1);

  // Numbered in insertion order: Twin Peaks (1), Baker Beach (2).
  const orderBefore = await rows.evaluateAll((els) => els.map((el) => el.getAttribute("data-itinerary-stop-id")));
  expect(orderBefore).toEqual(["twin-peaks", "baker-beach"]);

  // The itinerary persisted to the oculi_demo_states blob (not a relation table).
  await expect
    .poll(() => store.persistedState.itineraryPlaceIds ?? [])
    .toEqual(["twin-peaks", "baker-beach"]);

  // --- Remove a stop ---
  await rows.filter({ hasText: "Twin Peaks" }).getByRole("button", { name: "Remove Twin Peaks from itinerary" }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.filter({ hasText: "Twin Peaks" })).toHaveCount(0);
  await expect
    .poll(() => store.persistedState.itineraryPlaceIds ?? [])
    .toEqual(["baker-beach"]);
});
