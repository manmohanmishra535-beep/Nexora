import { expect, test } from "@playwright/test";

import { authFile, waitForApi } from "./helpers";

test.use({ storageState: authFile });

// 1×1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

test("publishes a post with an image and the image loads", async ({ page }) => {
  const content = `e2e-${Date.now()}-image`;

  await page.goto("/");
  await page.locator("#composer").fill(content);

  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByAltText("Selected image 1")).toBeVisible();

  const created = waitForApi(page, "POST", /\/api\/posts$/);
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await created;

  const card = page.locator("article", { hasText: content });
  await expect(card).toBeVisible();

  const image = card.getByAltText("Post image");
  await expect(image).toBeVisible();

  // naturalWidth > 0 proves the bytes actually loaded, not just that an
  // <img> element exists in the DOM.
  await expect
    .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
});
