import { expect, test } from "@playwright/test";

import { authFile } from "./helpers";

// Signed-in visitor: the auth pages must send them somewhere useful instead of
// showing a form they can no longer use.
test.use({ storageState: authFile });

test("sign-in sends a signed-in visitor home", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page).toHaveURL("/");
});

test("sign-in honors a same-site redirect_url", async ({ page }) => {
  await page.goto("/sign-in?redirect_url=%2Fbookmarks");
  await expect(page).toHaveURL("/bookmarks");
});

test("falls back home for unsafe or looping redirect_url", async ({ page }) => {
  await page.goto("/sign-in?redirect_url=https%3A%2F%2Fevil.example");
  await expect(page).toHaveURL("/");
  expect(page.url()).not.toContain("evil");

  // Pointing back at an auth page would loop.
  await page.goto("/sign-in?redirect_url=%2Fsign-up");
  await expect(page).toHaveURL("/");
});

test("sign-up and password reset also send them home", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page).toHaveURL("/");

  await page.goto("/forgot-password");
  await expect(page).toHaveURL("/");
});
