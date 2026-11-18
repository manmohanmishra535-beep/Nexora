import { expect, test as setup } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

import { authFile, ensureTestUser, TEST_EMAIL } from "./helpers";

/**
 * Signs the throwaway account in once and saves the browser state; every
 * authenticated spec loads that file instead of repeating the flow.
 */
setup("sign in and save browser state", async ({ page }) => {
  await clerkSetup();
  await ensureTestUser();

  // clerk.signIn() needs a page that has already loaded Clerk.
  await page.goto("/");
  await clerk.loaded({ page });

  await clerk.signIn({ page, emailAddress: TEST_EMAIL });

  // Signed in only when home renders the feed instead of bouncing to /sign-in.
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#composer")).toBeVisible();

  await page.context().storageState({ path: authFile });
});
