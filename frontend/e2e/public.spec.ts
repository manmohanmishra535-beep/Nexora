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

  test("sign-up renders its form after Clerk loads", async ({ page }) => {
    await page.goto("/sign-up");

    // The signed-out guard shows a loading state until Clerk resolves, then
    // the form must appear — a regression here would leave visitors stuck on
    // the loading screen with no way to register.
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("password reset renders its form after Clerk loads", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.getByLabel("Email address")).toBeVisible();
  });

  test("robots.txt is a real robots file, not the profile catch-all", async ({
    request,
  }) => {
    // Without app/robots.ts the dynamic /[username] route answers /robots.txt
    // with an HTML profile page, which search crawlers reject.
    const res = await request.get("/robots.txt");

    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    expect(await res.text()).toContain("User-Agent:");
  });
});
