import { test } from "@playwright/test";

import { authFile } from "./helpers";

test.use({ storageState: authFile });

test("debug realtime", async ({ page }) => {
  page.on("websocket", (ws) => console.log("WS:", ws.url()));
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.text().includes("nexora")) {
      console.log("CONSOLE", msg.type() + ":", msg.text());
    }
  });
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("chunk") || url.includes(":5000")) {
      console.log("REQ:", url);
    }
  });

  await page.goto("/");
  await page.locator("#composer").waitFor({ timeout: 20_000 });

  // give the deferred import time to resolve
  await page.waitForTimeout(8_000);
  console.log("done waiting");
});
