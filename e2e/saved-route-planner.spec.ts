import { expect, type Page, test } from "@playwright/test";

type DemoState = {
  savedPlaceIds: string[];
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
    savedPlaceIds: ["golden-gate-overlook", "baker-beach", "battery-spencer", "twin-peaks"],
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

test("edits and saves a generated route plan from the Saved page", async ({ page }) => {
  const supabase = await mockSavedPlannerSupabase(page);

  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "Saved places" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plan a shoot day" })).toBeVisible();
  await expect(page.getByLabel(/Map preview|Live Mapbox map/)).toBeVisible();

  await page.getByLabel("Edit stops").click();
  await expect(page.getByRole("button", { name: /Move down/ }).first()).toBeVisible();

  await page.getByLabel("Add saved place to route").selectOption("baker-beach");
  await expect(page.getByText("Added Baker Beach to Morning route.")).toBeVisible();

  await page.getByRole("button", { name: /Pin/ }).first().click();
  await expect(page.getByText("Updated pinned stops for this route.")).toBeVisible();

  await page.getByRole("button", { name: /Move down/ }).first().click();
  await expect(page.getByText("Reordered route stops.")).toBeVisible();

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
