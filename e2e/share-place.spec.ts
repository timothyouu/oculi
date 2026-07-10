import { expect, test } from "@playwright/test";

// Guards the share-place feature (`components/share-place-button.tsx`,
// `lib/share-place.ts` `buildPlaceShareUrl`): a single click copies the
// exact place URL to the clipboard, no dropdown/menu (see CLAUDE.md's
// 2026-07-09 "Simplified the share affordance" entry).
//
// CLAUDE.md's testing note from that session: a synthetic `element.click()`
// from `page.evaluate` is NOT user-activated, so `navigator.clipboard.writeText`
// silently takes its failure branch. Every click below uses a real Playwright
// locator `.click()`, which does grant user activation.
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("copies the exact place URL to the clipboard from the place detail page", async ({ page }) => {
  await page.goto("/places/golden-gate-overlook");
  await expect(page.getByRole("heading", { name: "Golden Gate Bridge Overlook" })).toBeVisible();

  const shareButton = page.getByRole("button", { name: "Copy link to Golden Gate Bridge Overlook" });
  await shareButton.click();

  await expect(page.getByText("Link copied to clipboard")).toBeVisible();

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toBe(`${new URL(page.url()).origin}/places/golden-gate-overlook`);
});

test("copies the exact place URL to the clipboard from the map's selected-place card", async ({ page }) => {
  await page.goto("/map");

  // Works against either the live map or the stylized fallback - both render
  // the same marker aria-label convention and the same SelectedPlaceCard.
  const clusterMarker = page.locator('button[aria-label^="Select "]').first();
  await expect(clusterMarker).toBeVisible({ timeout: 20_000 });
  await clusterMarker.click();

  const shareButton = page.locator('button[aria-label^="Copy link to "]');
  await expect(shareButton).toBeVisible({ timeout: 20_000 });
  const ariaLabel = await shareButton.getAttribute("aria-label");
  const placeName = (ariaLabel ?? "").replace(/^Copy link to /, "");
  expect(placeName.length).toBeGreaterThan(0);

  await shareButton.click();

  await expect(page.getByText("Link copied to clipboard")).toBeVisible();

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  const origin = new URL(page.url()).origin;
  expect(clipboardText.startsWith(`${origin}/places/`)).toBe(true);
});
