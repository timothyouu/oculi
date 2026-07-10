import { expect, type Page, test } from "@playwright/test";

// Guards the Discover deck ("/") resume regression fixed 2026-07-09 (see
// CLAUDE.md): landing on a swiped-to card immediately marks it "viewed",
// which used to drop that exact card from the next queue rebuild and land
// the visitor on an unrelated place every reload. `lib/discovery-queue.ts`
// `buildResumableQueue` now always keeps the resume anchor in the rebuilt
// queue - this spec reproduces the original bug report end-to-end through
// the UI rather than just the unit-tested pure helper.

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
  const upserts: Array<{ state: DemoState }> = [];

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
      upserts.push(body);
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

  return { getState: () => persistedState, upserts };
}

async function dismissTutorialIfPresent(page: Page) {
  const gotIt = page.getByRole("button", { name: "Got it" });
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click();
  }
}

test("resumes the Discover deck on the exact same place across repeated reloads", async ({ page }) => {
  const supabase = await mockSupabaseState(page);

  await page.goto("/");
  await dismissTutorialIfPresent(page);

  const passButton = page.locator('button[aria-label^="Pass on "]');
  await expect(passButton).toBeVisible();

  // Advance past a couple of cards so we land on a specific, non-default place.
  await passButton.click();
  await expect(passButton).toBeVisible();
  await passButton.click();
  await expect(passButton).toBeVisible();

  const targetLabel = await passButton.getAttribute("aria-label");
  expect(targetLabel).toBeTruthy();

  // Wait for the debounced Supabase write (350ms in lib/demo-state.tsx) to
  // actually persist the resume anchor before reloading.
  await expect.poll(() => supabase.getState().lastDiscoveryPlaceId).toBeTruthy();

  await page.reload();
  await dismissTutorialIfPresent(page);

  await expect(page.locator('button[aria-label^="Pass on "]')).toHaveAttribute(
    "aria-label",
    targetLabel as string,
    { timeout: 10_000 },
  );

  // Reload a second time - the fix must hold even after landing on the
  // resumed card re-marks it "viewed" again.
  await page.reload();
  await dismissTutorialIfPresent(page);

  await expect(page.locator('button[aria-label^="Pass on "]')).toHaveAttribute(
    "aria-label",
    targetLabel as string,
    { timeout: 10_000 },
  );
});
