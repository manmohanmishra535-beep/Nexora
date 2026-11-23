"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { useMyProfile } from "@/hooks/useNexora";
import { ApiError } from "@/lib/api";

/**
 * Old links used /profile. Send them to the real, username-based profile.
 */
export default function ProfileRedirectPage() {
  const router = useRouter();
  const me = useMyProfile();

  useEffect(() => {
    if (me.data?.username) {
      router.replace(`/${me.data.username}`);
    }
  }, [me.data?.username, router]);

  if (me.isError) {
    // A dead backend surfaces as a NETWORK error; an unsynced profile is an
    // HTTP error. Telling them apart stops "the API is down" from reading as
    // "your account is gone".
    const unreachable =
      me.error instanceof ApiError && me.error.code === "NETWORK";

    return (
      <>
        <PageHeader title="Profile" />
        {unreachable ? (
          <EmptyState
            icon="spark"
            title="Cannot reach the Nexora API"
            body="The backend is not responding. Start it (npm run dev in backend/) or check your connection, then try again."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => me.refetch()}
              >
                Try again
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon="user"
            title="We couldn't find your profile"
            body="Your local Nexora profile may not be synced yet. Reload the page or sign in again."
          />
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Profile" />
      <Spinner label="Opening your profile" />
    </>
  );
}
