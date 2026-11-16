"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

import { useApi } from "@/hooks/useApi";

/**
 * Clerk owns identity. This keeps the Mongo profile's display name and
 * avatar fresh after a person edits them in Clerk, and creates the profile
 * on first sign-in. Failures are non-fatal: the API also lazily creates it.
 */
export default function UserSync() {
  const { isLoaded, isSignedIn } = useAuth();
  const api = useApi();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;

    api
      .post("/users/sync")
      .then(() => {
        if (!cancelled) {
          // Profile queries pick up refreshed Clerk fields on next focus.
        }
      })
      .catch(() => {
        // Offline or a cold API: the lazy path in requireAuth still works.
      });

    return () => {
      cancelled = true;
    };
  }, [api, isLoaded, isSignedIn]);

  return null;
}
