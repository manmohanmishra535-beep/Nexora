import { expect, test } from "@playwright/test";

import { authFile } from "./helpers";

test.use({ storageState: authFile });

// The API origin the app itself is configured with (same value the socket
// connects to via SOCKET_URL in lib/api.ts).
const apiHost = new URL(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
).host;

// socket.io-client is dynamically imported so it stays out of the first-load
// bundle; this proves the deferred chunk still opens the realtime connection.
test("realtime socket connects after the deferred chunk loads", async ({
  page,
}) => {
  // Playwright's url option does not apply to websocket events, so match the
  // socket.io path in a predicate (the dev server's HMR socket must not match).
  const socket = page.waitForEvent("websocket", {
    timeout: 20_000,
    predicate: (ws) => ws.url().includes("/socket.io"),
  });

  await page.goto("/");
  await expect(page.locator("#composer")).toBeVisible();

  const ws = await socket;
  expect(new URL(ws.url()).host).toBe(apiHost);
});
