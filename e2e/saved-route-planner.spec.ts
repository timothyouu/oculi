import { expect, type Page, test } from "@playwright/test";

// Guards the shoot-day route planner on /saved end-to-end: opening the
// editor, adding a stop, pinning a stop, drag-reordering stops, regenerating
// the route, and saving it to Supabase.
//
// This spec previously assumed a `<select>` ("Add saved place to route")
// for adding stops and explicit "Move up"/"Move down" buttons for
// reordering. Commit 8030e39 ("Improve app state and discovery flows")
// replaced both: adding a stop is now a horizontal rail of clickable place
// tiles (`AddStopTileRail`, container aria-label "Add saved places to
// route"), and reordering is now pointer/mouse-driven drag-and-drop on the
// stop cards themselves (`components/saved-panel.tsx`'s
// `startStopMouseDrag`/`moveDraggedStop`/`endStopMouseDrag`, keyed off
// `data-route-stop-id`) rather than per-row buttons. This rewrite drives
// both real UI surfaces instead of the stale ones.
//
// Like `saved-roundtrip.spec.ts`, `savedPlaceIds` now lives in the
// `saved_places` table (docs/demo-to-product-audit.md item 6,
// 20260710000600_normalize_user_relations.sql) rather than the
// `oculi_demo_states` JSON blob, so this mock seeds `saved_places` directly
// and intercepts the other per-entity relation tables so the bootstrap
// `Promise.all` doesn't stall against the nonexistent local Supabase host
// configured in playwright.config.ts.

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

const SEEDED_SAVED_PLACE_IDS = ["golden-gate-overlook", "baker-beach", "battery-spencer", "twin-peaks"];

// Saving a route plan now requires a resolved real auth identity: route_plans
// rows are RLS-scoped to auth.uid() and components/saved-panel.tsx refuses to
// save while `authUser` is still null (docs/demo-to-product-implementation.md
// item 3 -- no more fictional user-guest fallback). This spec's environment
// points at a dead Supabase host (playwright.config.ts), so the auth
// endpoints must be mocked for `ensureAuthSession` (lib/auth-session.ts) to
// resolve: it calls `supabase.auth.getSession()` (local-storage only, no
// network on a fresh profile) and then `supabase.auth.signInAnonymously()`,
// which POSTs to `/auth/v1/signup` and expects a session JSON back.
const FAKE_AUTH_USER_ID = "9b1de552-0000-4000-8000-3f4b6e2a7c11";

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function buildFakeAnonymousSession() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = nowSeconds + 3600;
  const user = {
    id: FAKE_AUTH_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "",
    phone: "",
    app_metadata: {},
    user_metadata: {},
    // No identities = anonymous session (see lib/auth-session.ts
    // sessionToAuthUser).
    identities: [],
    is_anonymous: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // A syntactically valid (unsigned-checkable) JWT so any client-side decode
  // of the access token finds a real header/payload.
  const accessToken = [
    base64Url({ alg: "HS256", typ: "JWT" }),
    base64Url({ sub: FAKE_AUTH_USER_ID, role: "authenticated", is_anonymous: true, exp: expiresAt }),
    "playwright-fake-signature",
  ].join(".");

  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: "playwright-fake-refresh-token",
    user,
  };
}

async function mockSupabaseAuth(page: Page) {
  await page.route("**/auth/v1/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const session = buildFakeAnonymousSession();

    // Anonymous sign-in (`signInAnonymously`) posts to /auth/v1/signup and
    // token refreshes post to /auth/v1/token -- both expect a session JSON.
    if (request.method() === "POST" && (url.includes("/auth/v1/signup") || url.includes("/auth/v1/token"))) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
      return;
    }

    if (url.includes("/auth/v1/user")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session.user) });
      return;
    }

    if (url.includes("/auth/v1/logout")) {
      await route.fulfill({ status: 204 });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}

async function mockSavedPlannerSupabase(page: Page) {
  await mockSupabaseAuth(page);
  let persistedState = createInitialState();
  let savedPlaceIds = [...SEEDED_SAVED_PLACE_IDS];
  const routePlanInserts: unknown[] = [];
  const routeStopInserts: unknown[] = [];

  await page.route("**/rest/v1/oculi_demo_states**", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ state: { ...persistedState, savedPlaceIds: [] } }),
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

test("edits, drag-reorders, and saves a generated route plan from the Saved page", async ({ page }) => {
  const supabase = await mockSavedPlannerSupabase(page);

  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "Saved places" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plan a shoot day" })).toBeVisible();
  await expect(page.getByLabel(/Map preview|Live Mapbox map/)).toBeVisible();

  // Open the editor - this reveals the add-stop tile rail, the drag
  // handles, and the per-stop Pin/Remove actions.
  await page.getByLabel("Edit stops").click();

  const addStopRail = page.locator('[aria-label="Add saved places to route"] button');
  await expect(addStopRail.first()).toBeVisible();
  const addedPlaceName = (await addStopRail.first().locator("span.font-semibold").innerText()).trim();
  await addStopRail.first().click();
  await expect(page.getByText(`Added ${addedPlaceName} to Morning route.`)).toBeVisible();

  // Pin the first stop. Use an exact match so this doesn't also match an
  // "Unpin" button once something is pinned.
  await page.getByRole("button", { name: "Pin", exact: true }).first().click();
  await expect(page.getByText("Updated pinned stops for this route.")).toBeVisible();

  // Drag-reorder: pick up the first stop card (grabbing a non-interactive
  // area, away from its Pin/Remove buttons) and drop it onto the second
  // stop card. The component listens for real mouse/pointer events on the
  // card itself, not a "Move down" button.
  const stopRows = page.locator("[data-route-stop-id]");
  await expect(stopRows.nth(1)).toBeVisible();
  const firstBox = await stopRows.nth(0).boundingBox();
  const secondBox = await stopRows.nth(1).boundingBox();
  if (!firstBox || !secondBox) {
    throw new Error("Expected both route stop cards to have a bounding box.");
  }

  await page.mouse.move(firstBox.x + 24, firstBox.y + 24);
  await page.mouse.down();
  await page.mouse.move(firstBox.x + 24, firstBox.y + 60, { steps: 5 });
  await page.mouse.move(secondBox.x + 24, secondBox.y + 24, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByText("Reordered route stops.")).toBeVisible();

  await page.getByRole("button", { name: "Regenerate route" }).click();
  await expect(page.getByText(/Regenerated route/)).toBeVisible();

  await page.getByRole("button", { name: "Save route plan" }).click();
  await expect(page.getByText("Saved Morning route plan.")).toBeVisible();

  expect(supabase.routePlanInserts).toHaveLength(1);
  expect(supabase.routeStopInserts).toHaveLength(1);
  expect(supabase.routePlanInserts[0]).toMatchObject({
    // The plan row must carry the real (mocked) auth session's user id,
    // never the fictional "user-guest" seed persona.
    user_id: FAKE_AUTH_USER_ID,
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
