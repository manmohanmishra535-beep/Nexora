import { expect, test } from "@playwright/test";

import { authFile, waitForApi } from "./helpers";

test.use({ storageState: authFile });

/**
 * The composer plus the three toggle buttons — this is exactly the flow
 * where the inverted-verb and repost-serializer bugs slipped through.
 */
test("composer post keeps like, bookmark and repost toggles in sync", async ({
  page,
}) => {
  const content = `e2e-${Date.now()}-toggles`;

  await page.goto("/");

  // --- create -------------------------------------------------------------
  const created = waitForApi(page, "POST", /\/api\/posts$/);
  await page.locator("#composer").fill(content);
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await created;

  const card = page.locator("article", { hasText: content });
  await expect(card).toBeVisible();

  // --- like ---------------------------------------------------------------
  const like = () => card.getByRole("button", { name: /^Like,/ });
  await expect(like()).toHaveAttribute("aria-pressed", "false");

  const liked = waitForApi(page, "POST", /\/api\/posts\/[^/]+\/like$/);
  await like().click();
  await liked;
  await expect(like()).toHaveAttribute("aria-pressed", "true");

  // Still lit after a full reload — the state must come from the server.
  await page.reload();
  await expect(like()).toHaveAttribute("aria-pressed", "true");

  const unliked = waitForApi(page, "DELETE", /\/api\/posts\/[^/]+\/like$/);
  await like().click();
  await unliked;
  await expect(like()).toHaveAttribute("aria-pressed", "false");

  await page.reload();
  await expect(like()).toHaveAttribute("aria-pressed", "false");

  // --- bookmark -----------------------------------------------------------
  const bookmark = () =>
    card.getByRole("button", {
      name: /^(Bookmark post|Remove bookmark)$/,
    });

  const bookmarked = waitForApi(
    page,
    "POST",
    /\/api\/posts\/[^/]+\/bookmark$/,
  );
  await bookmark().click();
  await bookmarked;
  await expect(bookmark()).toHaveAttribute("aria-label", "Remove bookmark");

  await page.reload();
  await expect(bookmark()).toHaveAttribute("aria-label", "Remove bookmark");

  const unbookmarked = waitForApi(
    page,
    "DELETE",
    /\/api\/posts\/[^/]+\/bookmark$/,
  );
  await bookmark().click();
  await unbookmarked;
  await expect(bookmark()).toHaveAttribute("aria-label", "Bookmark post");

  // --- repost (on the post page) ------------------------------------------
  // The feed would show a second "repost wrapper" card carrying the same
  // text; the post page has exactly one card, so locators stay unambiguous.
  await card.getByText(content).click();
  await expect(page).toHaveURL(/\/post\/[0-9a-f]{24}$/);

  const repost = () =>
    page
      .locator("article", { hasText: content })
      .getByRole("button", { name: /^Repost,/ });

  await expect(repost()).toHaveAttribute("aria-pressed", "false");

  const reposted = waitForApi(page, "POST", /\/api\/posts\/[^/]+\/repost$/);
  await repost().click();
  await reposted;
  await expect(repost()).toHaveAttribute("aria-pressed", "true");

  // Regression: repostedByMe must survive refetch (serializer bug).
  await page.reload();
  await expect(repost()).toHaveAttribute("aria-pressed", "true");

  // Toggle off — must be a DELETE, not a 409.
  const unreposted = waitForApi(page, "DELETE", /\/api\/posts\/[^/]+\/repost$/);
  await repost().click();
  await unreposted;
  await expect(repost()).toHaveAttribute("aria-pressed", "false");

  await page.reload();
  await expect(repost()).toHaveAttribute("aria-pressed", "false");
});
