"use client";

import { RedirectToSignIn, useAuth } from "@clerk/nextjs";

/**
 * Resource-based sign-out gate for the protected route group. Clerk
 * deprecated middleware path gates (`createRouteMatcher`), so each route
 * group now owns its own check; this layout is that check for every page
 * under `(protected)` (home, explore, notifications, messages, bookmarks,
 * settings, profile, edit-profile).
 *
 * Children render while Clerk resolves, so signed-in visitors keep the
 * server-rendered page with no blank flash; only once the session is known
 * to be absent do we send the browser to sign-in. Note this gate covers the
 * UI shell only — privileged data always comes from the Express API, which
 * verifies a Clerk token on every request, plus Socket.IO's handshake.
 */
export default function RequireSession({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, userId } = useAuth();

  if (isLoaded && !userId) {
    return <RedirectToSignIn />;
  }

  return <>{children}</>;
}
