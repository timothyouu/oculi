import { expect, type Page, test } from "@playwright/test";

// Guards the save/unsave round-trip: saving a place must survive a reload
// and show up on /saved, and unsaving must survive a reload too. Persistence
// goes through localStorage + Supabase (`lib/demo-state.tsx`,
// `lib/remote-state.ts`) - this spec asserts the UI-visible round-trip
// rather than the storage internals directly.
//
// docs/demo-to-product-audit.md item 6 moved savedPlaceIds out of the
// `oculi_demo_states` whole-state blob into its own `saved_places` table
// (one row per (user, place), see 20260710000600_normalize_user_relations.sql)
// -- this mock now intercepts both tables: `oculi_demo_states` for the
// remaining scalar/session fields, and `saved_places` (insert/delete) as the
// real source of truth for the save toggle itself.

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

async function mockSupabaseState(page: Page) {
  let persistedState = createInitialState();
  let savedPlaceIds: string[] = [];

  await page.route("**/rest/v1/oculi_demo_states**", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      // Explicitly send empty legacy relation arrays alongside the scalar
      // state, even though `DemoState` no longer carries them (item 6) --
      // this simulates "an existing but empty legacy blob" so
      // `normalizeDemoState`'s Array.isArray check finds them and does not
      // fall back to the seeded demo defaults (which start with
      // "golden-gate-overlook" pre-saved). Real per-entity-table state
      // (the actual source of truth going forward) comes from the
      // `saved_places` mock below.
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          state: {
            ...persistedState,
            savedPlaceIds: [],
            likedPhotoIds: persistedState.likedPhotoIds,
            viewedPhotoIds: persistedState.viewedPhotoIds,
          },
        }),
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

  // The other three per-entity relation tables (item 6) and the real
  // saveCount RPC aren't exercised by this spec, but must still be
  // intercepted -- this suite runs against a Playwright webServer whose
  // NEXT_PUBLIC_SUPABASE_URL points at a non-existent local stack
  // (127.0.0.1:54321, see playwright.config.ts), so leaving them unmocked
  // means the client waits on real network calls to a host with nothing
  // listening, which stalls the whole bootstrap Promise.all instead of
  // failing fast and predictably.
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

  // Real follower/like count RPCs (docs/demo-to-product-implementation.md
  // item 4), mirroring place_save_counts above.
  await page.route("**/rest/v1/rpc/user_follow_counts**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route("**/rest/v1/rpc/photo_like_counts**", async (route) => {
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

  return { getState: () => ({ ...persistedState, savedPlaceIds }) };
}

const PLACE_ID = "golden-gate-overlook";
const PLACE_NAME = "Golden Gate Bridge Overlook";

test("saving a place persists across reload and appears on /saved; unsaving persists too", async ({ page }) => {
  const supabase = await mockSupabaseState(page);

  await page.goto(`/places/${PLACE_ID}`);
  await expect(page.getByRole("heading", { name: PLACE_NAME })).toBeVisible();

  const bookmarkButton = page.getByRole("button", { name: "Bookmark", exact: true });
  await expect(bookmarkButton).toBeVisible();
  await bookmarkButton.click();
  await expect(page.getByRole("button", { name: "Bookmarked", exact: true })).toBeVisible();

  await expect.poll(() => supabase.getState().savedPlaceIds).toContain(PLACE_ID);

  // Reload the place page itself - the save must survive.
  await page.reload();
  await expect(page.getByRole("button", { name: "Bookmarked", exact: true })).toBeVisible();

  // And it must show up on /saved.
  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "Saved places" })).toBeVisible();
  await expect(page.getByRole("heading", { name: PLACE_NAME, level: 2 })).toBeVisible();

  // Reload /saved itself - still there.
  await page.reload();
  await expect(page.getByRole("heading", { name: PLACE_NAME, level: 2 })).toBeVisible();

  // Unsave from the /saved list.
  await page.getByRole("button", { name: `Remove ${PLACE_NAME} from saved places` }).click();
  await expect.poll(() => supabase.getState().savedPlaceIds).not.toContain(PLACE_ID);
  await expect(page.getByRole("heading", { name: PLACE_NAME, level: 2 })).toHaveCount(0);

  // Reload - it must stay gone.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Saved places" })).toBeVisible();
  await expect(page.getByRole("heading", { name: PLACE_NAME, level: 2 })).toHaveCount(0);
});
