"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Decision for the auth pages (recorded in docs/ALIGNMENT.md): an
 * already-signed-in visitor should not sit on /sign-in, /sign-up or
 * /forgot-password. Each of those pages renders this component inside its
 * signed-in guard, and it navigates away to:
 *
 * - `redirect_url` when present and safe — that is where the middleware's
 *   signed-out redirect was sending them, so honoring it returns them to the
 *   page they originally asked for; or
 * - `/` otherwise (missing, off-site, or pointing back at an auth page,
 *   which would loop).
 *
 * Only same-site paths qualify: one leading slash, never `//host` or
 * `/\host`, which browsers would treat as a protocol-relative URL.
 */
function safeReturnPath(raw: string | null): string {
  if (!raw) return "/";

  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }

  if (/^\/(?:sign-in|sign-up|forgot-password)(?:[/?#]|$)/.test(raw)) {
    return "/";
  }

  return raw;
}

export default function LeaveAuthPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const target = safeReturnPath(
      new URLSearchParams(window.location.search).get("redirect_url"),
    );
    router.replace(target);
  }, [isLoaded, isSignedIn, router]);

  return null;
}
