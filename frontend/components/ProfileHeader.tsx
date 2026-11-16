"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { useApi } from "@/hooks/useApi";
import { useFollow } from "@/hooks/usePostActions";
import { ApiError } from "@/lib/api";
import { formatCount, formatJoined } from "@/lib/format";
import type { Conversation, User } from "@/lib/types";

export default function ProfileHeader({ user }: { user: User }) {
  const api = useApi();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const follow = useFollow();
  const { toast } = useToast();

  const message = useMutation({
    mutationFn: () =>
      api.post<{ conversation: Conversation }>("/conversations", {
        userId: user._id,
      }),
    onSuccess: (data) => {
      router.push(`/messages/${data.conversation._id}`);
    },
    onError: (error) => {
      toast(
        error instanceof ApiError
          ? error.message
          : "Couldn't open that conversation.",
        "error"
      );
    },
  });

  return (
    <section aria-label={`${user.displayName} profile`}>
      <div className="h-32 bg-gradient-to-br from-accent-soft via-surface-2 to-surface-2 min-[720px]:h-40" />

      <div className="px-4 pb-4 sm:px-5">
        <div className="flex items-end justify-between gap-3">
          <div className="-mt-12 rounded-full border-4 border-surface bg-surface min-[720px]:-mt-14">
            <Avatar
              src={user.profileImage?.url}
              name={user.displayName}
              size={96}
            />
          </div>

          <div className="mb-1 flex items-center gap-2 pt-2">
            {user.isMe ? (
              <Link href="/settings">
                <Button variant="secondary" size="sm">
                  Edit profile
                </Button>
              </Link>
            ) : !isSignedIn ? (
              <Link href="/sign-in">
                <Button size="sm">Sign in to follow</Button>
              </Link>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label="Message"
                  disabled={message.isPending}
                  onClick={() => message.mutate()}
                >
                  <Icon name="mail" size={16} />
                  <span className="hidden sm:inline">Message</span>
                </Button>

                <Button
                  size="sm"
                  variant={user.isFollowing ? "secondary" : "primary"}
                  aria-pressed={user.isFollowing}
                  disabled={follow.isPending}
                  onClick={() =>
                    follow.mutate({
                      user,
                      follow: !user.isFollowing,
                    })
                  }
                >
                  {user.isFollowing ? "Following" : "Follow"}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-3">
          <h2 className="font-display text-[22px] font-bold leading-tight text-ink">
            {user.displayName}
          </h2>
          <p className="text-[13px] text-ink-3">@{user.username}</p>
        </div>

        {user.bio && (
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-6 text-ink">
            {user.bio}
          </p>
        )}

        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-3">
          <Icon name="calendar" size={15} />
          Joined {formatJoined(user.createdAt)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
          <span className="text-ink-2">
            <b className="font-semibold text-ink">
              {formatCount(user.postsCount)}
            </b>{" "}
            posts
          </span>

          <Link
            href={`/${user.username}/following`}
            className="text-ink-2 hover:underline"
          >
            <b className="font-semibold text-ink">
              {formatCount(user.followingCount)}
            </b>{" "}
            following
          </Link>

          <Link
            href={`/${user.username}/followers`}
            className="text-ink-2 hover:underline"
          >
            <b className="font-semibold text-ink">
              {formatCount(user.followersCount)}
            </b>{" "}
            followers
          </Link>
        </div>
      </div>
    </section>
  );
}
