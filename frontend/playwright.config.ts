import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * @clerk/testing reads its keys from process.env. Copy the few values the
 * suite needs from the same files the dev servers use — frontend/.env.local
 * first, backend/.env as fallback. Only these keys are loaded: copying
 * everything would leak backend's PORT into `next dev` and shift it off 3000.
 */
const neededKeys = new Set([
  "CLERK_SECRET_KEY",
  "CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_API_URL",
]);

for (const file of [
  path.join(__dirname, ".env.local"),
  path.join(__dirname, "..", "backend", ".env"),
]) {
  if (!fs.existsSync(file)) continue;

  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (
      match &&
      neededKeys.has(match[1]) &&
      process.env[match[1]] === undefined
    ) {
      process.env[match[1]] = match[2];
    }
  }
}

const FRONTEND_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // One throwaway account and one shared feed — keep runs strictly serial.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalTeardown: "./e2e/teardown.ts",
  use: {
    baseURL: FRONTEND_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "e2e",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node src/server.js",
      cwd: path.join(__dirname, "..", "backend"),
      url: "http://127.0.0.1:5000/api/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      cwd: __dirname,
      url: `${FRONTEND_URL}/manmohanmishra535`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
