"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import Spinner from "@/components/ui/Spinner";
import { useMyProfile } from "@/hooks/useNexora";

export default function ProfileRedirect() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const me = useMyProfile(Boolean(isSignedIn));

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const username =
      me.data?.username || user?.username || user?.firstName?.toLowerCase();

    if (username) {
      router.replace(`/${username}`);
    }
  }, [isLoaded, isSignedIn, user, me.data, router]);

  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <Spinner label="Redirecting to profile…" />
    </div>
  );
}
