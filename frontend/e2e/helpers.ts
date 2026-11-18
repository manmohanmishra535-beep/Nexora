import path from "node:path";

import type { Page, Response } from "@playwright/test";

/** Throwaway Clerk account used only by these tests — never an owner account. */
export const TEST_EMAIL = "nexora+clerk_test@example.com";

/**
 * The instance requires a password on user creation; the ticket-based
 * sign-in never asks for it, so the value only has to exist.
 */
const TEST_PASSWORD = "Nexora-e2e-2026!";

const API_URL = `${
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(
    /\/+$/,
    "",
  )
}/api`;

const CLERK_API = "https://api.clerk.com/v1";

/** Browser state written by auth.setup.ts and loaded by authenticated specs. */
export const authFile = path.join(__dirname, ".auth", "user.json");

function clerkHeaders(): Record<string, string> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "CLERK_SECRET_KEY is not set — playwright.config.ts loads it from frontend/.env.local or backend/.env",
    );
  }
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * Resolves with the next API response whose method and pathname match, so
 * assertions can wait for the server instead of racing optimistic updates.
 */
export function waitForApi(
  page: Page,
  method: string,
  pathname: RegExp,
): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.request().method() === method &&
      pathname.test(new URL(response.url()).pathname),
  );
}

let cachedUserId: string | null = null;

/** Creates the throwaway user on the Clerk dev instance if it is missing. */
export async function ensureTestUser(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  const lookup = await fetch(
    `${CLERK_API}/users?email_address=${encodeURIComponent(TEST_EMAIL)}`,
    { headers: clerkHeaders() },
  );
  if (!lookup.ok) {
    throw new Error(
      `Clerk user lookup failed (${lookup.status}): ${await lookup.text()}`,
    );
  }
  const users = await lookup.json();
  // This endpoint answers with a bare array (some versions wrap it in `data`).
  const list: unknown[] = Array.isArray(users)
    ? users
    : ((users as { data?: unknown[] }).data ?? []);

  // The email_address filter narrows the list server-side; the extra match
  // guards against the filter being ignored.
  const existing = list.find((user) =>
    JSON.stringify(user).includes(TEST_EMAIL),
  ) as { id?: string } | undefined;

  if (existing?.id) {
    cachedUserId = existing.id;
    return existing.id;
  }

  const created = await fetch(`${CLERK_API}/users`, {
    method: "POST",
    headers: clerkHeaders(),
    body: JSON.stringify({
      // Backend API is snake_case; email_address takes an array.
      email_address: [TEST_EMAIL],
      password: TEST_PASSWORD,
    }),
  });
  if (!created.ok) {
    throw new Error(
      `Clerk user create failed (${created.status}): ${await created.text()}`,
    );
  }
  const user = await created.json();
  cachedUserId = user.id;
  return user.id;
}

/** Mints a short-lived Backend API session token for the test user. */
export async function mintToken(): Promise<string> {
  const userId = await ensureTestUser();

  const session = await fetch(`${CLERK_API}/sessions`, {
    method: "POST",
    headers: clerkHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });
  if (!session.ok) {
    throw new Error(
      `Clerk session create failed (${session.status}): ${await session.text()}`,
    );
  }
  const { id } = await session.json();

  const tokens = await fetch(`${CLERK_API}/sessions/${id}/tokens`, {
    method: "POST",
    headers: clerkHeaders(),
    body: "{}",
  });
  if (!tokens.ok) {
    throw new Error(
      `Clerk token create failed (${tokens.status}): ${await tokens.text()}`,
    );
  }
  const body = await tokens.json();
  if (!body.jwt) throw new Error("Clerk token response had no jwt field");
  return body.jwt;
}

/** Deletes every post the test user owns so runs never pollute real feeds. */
export async function deleteTestUserPosts(): Promise<void> {
  try {
    const auth = { Authorization: `Bearer ${await mintToken()}` };

    const me = await fetch(`${API_URL}/users/me`, { headers: auth });
    if (!me.ok) return;
    const { user } = await me.json();

    const posts = await fetch(
      `${API_URL}/posts/user/${user.username}?limit=50`,
      { headers: auth },
    );
    if (!posts.ok) return;
    const { items } = await posts.json();

    for (const item of items ?? []) {
      await fetch(`${API_URL}/posts/${item._id}`, {
        method: "DELETE",
        headers: auth,
      });
    }
  } catch (error) {
    console.warn("e2e cleanup skipped:", error);
  }
}
