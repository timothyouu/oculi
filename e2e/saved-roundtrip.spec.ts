import { expect, type Page, test } from "@playwright/test";

// Guards the save/unsave round-trip: saving a place must survive a reload
// and show up on /saved, and unsaving must survive a reload too. Persistence
// goes through localStorage + Supabase (`lib/demo-state.tsx`,
// `lib/remote-state.ts`) - this spec asserts the UI-visible round-trip
// rather than the storage internals directly.

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
    savedPlaceIds: [],
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

  return { getState: () => persistedState };
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
