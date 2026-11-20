"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import Spinner from "@/components/ui/Spinner";
import { useMyProfile } from "@/hooks/useNexora";

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
    return (
      <>
        <PageHeader title="Profile" />
        <EmptyState
          icon="user"
          title="We couldn't find your profile"
          body="Your local Nexora profile may not be synced yet. Reload the page or sign in again."
        />
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
