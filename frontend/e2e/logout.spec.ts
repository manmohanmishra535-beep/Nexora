import { expect, test } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

import { ensureTestUser, TEST_EMAIL } from "./helpers";

// Signs in fresh instead of loading storageState: logging out would revoke
// the saved session that the other specs share.
test("logout asks for confirmation before signing out", async ({ page }) => {
  await clerkSetup();
  await ensureTestUser();

  await page.goto("/");
  await clerk.loaded({ page });
  await clerk.signIn({ page, emailAddress: TEST_EMAIL });

  await page.goto("/");
  await expect(page.locator("#composer")).toBeVisible();

  // Cancel keeps the session.
  await page.getByRole("button", { name: "Sign out" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Log out of Nexora?");
  await dialog.getByRole("button", { name: "Stay signed in" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("#composer")).toBeVisible();

  // Confirm signs out and lands on /sign-in.
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in/);
});
