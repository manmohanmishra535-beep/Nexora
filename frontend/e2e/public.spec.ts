import { expect, test } from "@playwright/test";

// No storageState here: these tests must run signed out.
test.describe("signed out", () => {
  test("home redirects to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("public profile renders", async ({ page }) => {
    await page.goto("/manmohanmishra535");

    // Post cards repeat the @handle, so scope to the first occurrence —
    // the profile header renders above them.
    await expect(
      page.getByText("@manmohanmishra535", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in to follow" }),
    ).toBeVisible();
  });
});
