"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { useFollow } from "@/hooks/usePostActions";
import type { User } from "@/lib/types";

export default function UserRow({
  user,
  showBio = false,
}: {
  user: User;
  showBio?: boolean;
}) {
  const follow = useFollow();
  const { isSignedIn } = useAuth();

  // Keep an optimistic value until the user prop catches up after a refetch.
  const [optimistic, setOptimistic] = useState<{
    value: boolean;
    base: boolean;
  } | null>(null);
  const following =
    optimistic && optimistic.base === user.isFollowing
      ? optimistic.value
      : user.isFollowing;

  const toggle = () => {
    const next = !following;

    setOptimistic({ value: next, base: user.isFollowing });
    follow.mutate(
      { user, follow: next },
      {
        onError: () =>
          setOptimistic({ value: following, base: user.isFollowing }),
      }
    );
  };

  return (
    <div className="flex items-center gap-3 py-3">
      <Link
        href={`/${user.username}`}
        className="shrink-0 rounded-full"
        aria-label={`${user.displayName} profile`}
      >
        <Avatar
          src={user.profileImage?.url}
          name={user.displayName}
          size={44}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/${user.username}`}
          className="block truncate font-display text-[15px] font-bold text-ink hover:underline"
        >
          {user.displayName || user.username}
        </Link>

        <p className="truncate text-[13px] text-ink-3">@{user.username}</p>

        {showBio && user.bio && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink-2">
            {user.bio}
          </p>
        )}
      </div>

      {!user.isMe && isSignedIn && (
        <Button
          size="sm"
          variant={following ? "secondary" : "primary"}
          aria-pressed={following}
          disabled={follow.isPending}
          onClick={toggle}
        >
          {following ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  );
}
