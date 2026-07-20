import { expect, type Page, test } from "@playwright/test";

const CURRENT_USER_ID = "user-guest";
const AUTH_USER_ID = "13f99dd4-b649-471d-8f75-1a0915c0d30e";
const PHOTO_BUCKET = "oculi-photos";

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
  uploadedPhotos: Array<{
    id: string;
    placeId: string;
    userId: string;
    imageUrl: string;
    caption: string;
    locationLabel: string;
    metadataText?: string;
    shotAtTimeOfDay?: string;
    tags: string[];
    createdAt: string;
    likeCount: number;
  }>;
};

type SupabaseHarness = {
  getState: () => DemoState;
  upserts: Array<{ user_id: string; state: DemoState; updated_at: string }>;
  uploads: Array<{ url: string; method: string }>;
  photoUpserts: unknown[];
};

const pngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

function createInitialState(): DemoState {
  return {
    savedPlaceIds: ["golden-gate-overlook", "baker-beach"],
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

async function mockSupabase(
  page: Page,
  { failPhotoInsert = false, failUpload = false }: { failPhotoInsert?: boolean; failUpload?: boolean } = {},
): Promise<SupabaseHarness> {
  let persistedState = createInitialState();
  const upserts: SupabaseHarness["upserts"] = [];
  const uploads: SupabaseHarness["uploads"] = [];
  const photoUpserts: unknown[] = [];

  await page.route("**/auth/v1/signup**", async (route) => {
    const user = {
      id: AUTH_USER_ID,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: { provider: "anonymous", providers: ["anonymous"] },
      user_metadata: {},
      identities: [],
      is_anonymous: true,
      created_at: "2026-07-11T00:00:00.000Z",
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "playwright-access-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "playwright-refresh-token",
        user,
      }),
    });
  });

  await page.route("**/auth/v1/user**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: AUTH_USER_ID, aud: "authenticated", role: "authenticated" }),
    });
  });

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
      const body = JSON.parse(request.postData() ?? "{}") as SupabaseHarness["upserts"][number];
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

  // The four per-entity relation tables (docs/demo-to-product-audit.md item
  // 6) and the real saveCount RPC aren't exercised by this spec's
  // assertions, but must still be intercepted -- this suite runs against a
  // Playwright webServer whose NEXT_PUBLIC_SUPABASE_URL points at a
  // non-existent local stack (127.0.0.1:54321, see playwright.config.ts), so
  // leaving them unmocked means the client waits on real network calls to a
  // host with nothing listening, which stalls the bootstrap Promise.all
  // instead of failing fast and predictably.
  for (const table of ["saved_places", "followed_users", "liked_photos", "viewed_photos"]) {
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
    if (route.request().method() === "POST") {
      photoUpserts.push(JSON.parse(route.request().postData() ?? "{}"));
      if (failPhotoInsert) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ code: "42501", message: "Simulated photo row failure", details: null, hint: null }),
        });
        return;
      }
      await route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route("**/storage/v1/object**", async (route) => {
    const request = route.request();
    const url = request.url();

    if (url.includes(`/object/public/${PHOTO_BUCKET}/`)) {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: pngBuffer,
      });
      return;
    }

    uploads.push({ url, method: request.method() });
    if (failUpload) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Simulated storage failure" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ Key: url.split(`/object/${PHOTO_BUCKET}/`).at(-1) }),
    });
  });

  return {
    getState: () => persistedState,
    upserts,
    uploads,
    photoUpserts,
  };
}

test("publishes an uploaded photo to Supabase state and renders it after reload", async ({ page }) => {
  const supabase = await mockSupabase(page);
  const caption = "Playwright bridge smoke test";

  await page.goto("/places/golden-gate-overlook");
  await expect(page.getByRole("heading", { name: "Golden Gate Bridge Overlook" })).toBeVisible();

  await page
    .getByLabel("Photos from Golden Gate Bridge Overlook")
    .getByRole("button", { name: "Add photo", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add Photo" });
  await expect(dialog).toBeVisible();

  await dialog.locator('input[type="file"]').setInputFiles({
    name: "bridge-smoke-test.png",
    mimeType: "image/png",
    buffer: pngBuffer,
  });
  await expect(dialog.getByAltText("Selected upload preview")).toBeVisible();

  await dialog.getByLabel("Caption").fill(caption);
  await dialog.getByLabel("Best light").selectOption("Blue hour");
  await dialog.getByLabel("Camera detail").fill("70mm, f/5.6");
  await dialog.getByLabel("Tags").fill("bridge, smoke-test, blue hour");
  await dialog.getByRole("button", { name: "Publish photo" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByAltText(caption).first()).toBeVisible();

  await expect
    .poll(() => supabase.getState().uploadedPhotos.find((photo) => photo.caption === caption))
    .toMatchObject({
      placeId: "golden-gate-overlook",
      userId: CURRENT_USER_ID,
      metadataText: "70mm, f/5.6",
      shotAtTimeOfDay: "Blue hour",
      tags: ["bridge", "smoke-test", "blue hour"],
      likeCount: 0,
    });

  const persistedPhoto = supabase.getState().uploadedPhotos.find((photo) => photo.caption === caption);
  expect(persistedPhoto?.imageUrl).toContain(`/storage/v1/object/public/${PHOTO_BUCKET}/${AUTH_USER_ID}/upload-`);
  expect(supabase.uploads).toHaveLength(1);
  expect(supabase.photoUpserts).toHaveLength(1);
  expect(supabase.upserts.some((upsert) => upsert.state.uploadedPhotos.some((photo) => photo.caption === caption))).toBe(true);

  await page.goto(`/profile/${CURRENT_USER_ID}`);
  await expect(page.getByRole("heading", { name: "John Doe" })).toBeVisible();
  await expect(page.getByAltText(caption)).toBeVisible();
});

test("keeps the publish action disabled until a photo and caption are provided", async ({ page }) => {
  const supabase = await mockSupabase(page);

  await page.goto("/places/golden-gate-overlook");
  await page
    .getByLabel("Photos from Golden Gate Bridge Overlook")
    .getByRole("button", { name: "Add photo", exact: true })
    .click();

  const dialog = page.getByRole("dialog", { name: "Add Photo" });
  const publishButton = dialog.getByRole("button", { name: "Publish photo" });
  await expect(publishButton).toBeDisabled();

  await dialog.getByLabel("Caption").fill("Caption without an image");
  await expect(publishButton).toBeDisabled();

  await dialog.getByLabel("Caption").fill("");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "missing-caption.png",
    mimeType: "image/png",
    buffer: pngBuffer,
  });
  await expect(dialog.getByAltText("Selected upload preview")).toBeVisible();
  await expect(publishButton).toBeDisabled();

  expect(supabase.uploads).toHaveLength(0);
  expect(supabase.getState().uploadedPhotos).toEqual([]);
});

test("keeps the upload form open and retryable when storage fails", async ({ page }) => {
  const supabase = await mockSupabase(page, { failUpload: true });

  await page.goto("/places/golden-gate-overlook");
  await page
    .getByLabel("Photos from Golden Gate Bridge Overlook")
    .getByRole("button", { name: "Add photo", exact: true })
    .click();

  const dialog = page.getByRole("dialog", { name: "Add Photo" });
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "retry-upload.png",
    mimeType: "image/png",
    buffer: pngBuffer,
  });
  await dialog.getByLabel("Caption").fill("Retry this upload");
  await dialog.getByRole("button", { name: "Publish photo" }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("could not be uploaded");
  await expect(dialog.getByRole("button", { name: "Publish photo" })).toBeEnabled();
  expect(supabase.uploads).toHaveLength(1);
  expect(supabase.photoUpserts).toHaveLength(0);
  expect(supabase.getState().uploadedPhotos).toEqual([]);
});

test("removes the uploaded object when the photo row cannot be saved", async ({ page }) => {
  const supabase = await mockSupabase(page, { failPhotoInsert: true });

  await page.goto("/places/golden-gate-overlook");
  await page
    .getByLabel("Photos from Golden Gate Bridge Overlook")
    .getByRole("button", { name: "Add photo", exact: true })
    .click();

  const dialog = page.getByRole("dialog", { name: "Add Photo" });
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "cleanup-upload.png",
    mimeType: "image/png",
    buffer: pngBuffer,
  });
  await dialog.getByLabel("Caption").fill("Clean up this failed row");
  await dialog.getByRole("button", { name: "Publish photo" }).click();

  await expect(dialog.getByRole("alert")).toContainText("could not be published");
  await expect
    .poll(() => supabase.uploads.map((operation) => operation.method))
    .toEqual(expect.arrayContaining(["POST", "DELETE"]));
  expect(supabase.photoUpserts).toHaveLength(1);
  expect(supabase.getState().uploadedPhotos).toEqual([]);
});
