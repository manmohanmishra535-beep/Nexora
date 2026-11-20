"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import PostCard from "@/components/PostCard";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import InfiniteSentinel from "@/components/ui/InfiniteSentinel";
import Spinner from "@/components/ui/Spinner";
import Tabs from "@/components/ui/Tabs";
import {
  useLikedPosts,
  useProfile,
  useUserPosts,
  useUserReplies,
} from "@/hooks/useNexora";
import { useFollow } from "@/hooks/usePostActions";
import { formatCount, formatJoined, formatTimeAgo } from "@/lib/format";
import type { Comment, Post } from "@/lib/types";

const PROFILE_TABS = ["Posts", "Replies", "Likes"] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];

function ReplyItem({ comment }: { comment: Comment }) {
  return (
    <article className="border-b border-line px-4 py-4 transition-colors hover:bg-surface-2/40 sm:px-5">
      {comment.post && (
        <div className="mb-2 text-[13px] text-ink-3">
          Replying to{" "}
          <span className="font-semibold text-accent">
            @{comment.post.author?.username || "user"}
          </span>
        </div>
      )}

      <p className="text-[15px] leading-6 text-ink">{comment.content}</p>

      <div className="mt-2 text-[13px] text-ink-3">
        {formatTimeAgo(comment.createdAt)}
      </div>

      {comment.post && (
        <Link
          href={`/post/${comment.post._id}`}
          className="mt-3 block rounded-1 border border-line bg-surface-2/50 p-3 text-[13px] text-ink-2 hover:bg-surface-2"
        >
          <span className="font-semibold text-ink">
            {comment.post.author?.displayName || "Original post"}:
          </span>{" "}
          <span className="line-clamp-2">{comment.post.content}</span>
        </Link>
      )}
    </article>
  );
}

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const follow = useFollow();

  const username = params?.username ? decodeURIComponent(params.username) : "";
  const [activeTab, setActiveTab] = useState<ProfileTab>("Posts");

  const profileQuery = useProfile(username);
  const postsQuery = useUserPosts(username);
  const repliesQuery = useUserReplies(username);
  const likesQuery = useLikedPosts(username);

  const user = profileQuery.data;

  if (profileQuery.isLoading) {
    return (
      <AppShell>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-surface-2"
          >
            <Icon name="back" size={20} />
          </button>
          <h1 className="font-display text-[19px] font-bold text-ink">Profile</h1>
        </header>
        <Spinner label="Loading profile…" />
      </AppShell>
    );
  }

  if (profileQuery.isError || !user) {
    return (
      <AppShell>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-surface-2"
          >
            <Icon name="back" size={20} />
          </button>
          <h1 className="font-display text-[19px] font-bold text-ink">Profile</h1>
        </header>
        <EmptyState
          icon="user"
          title="Account doesn't exist"
          body="Try searching for another user or verify that the username is spelled correctly."
          action={
            <Button size="sm" onClick={() => router.push("/explore")}>
              Explore users
            </Button>
          }
        />
      </AppShell>
    );
  }

  const posts =
    postsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const replies =
    repliesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const likes =
    likesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const handleFollowToggle = () => {
    follow.mutate({ user, follow: !user.isFollowing });
  };

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-5">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-surface-2"
        >
          <Icon name="back" size={20} />
        </button>

        <div className="min-w-0">
          <h1 className="truncate font-display text-[19px] font-bold text-ink">
            {user.displayName || user.username}
          </h1>
          <p className="text-[12px] text-ink-3">
            {formatCount(user.postsCount || posts.length)} posts
          </p>
        </div>
      </header>

      {/* Banner */}
      <div className="h-32 bg-gradient-to-r from-accent/25 via-accent/15 to-surface-2 sm:h-44" />

      {/* Profile info */}
      <div className="px-4 pb-4 sm:px-5">
        <div className="flex items-end justify-between">
          <div className="-mt-12 rounded-full ring-4 ring-surface sm:-mt-16">
            <Avatar
              src={user.profileImage?.url}
              name={user.displayName}
              size={96}
            />
          </div>

          <div className="mb-2">
            {user.isMe ? (
              <Link href="/settings">
                <Button variant="secondary" size="sm">
                  Edit profile
                </Button>
              </Link>
            ) : isSignedIn ? (
              <Button
                variant={user.isFollowing ? "secondary" : "primary"}
                size="sm"
                disabled={follow.isPending}
                onClick={handleFollowToggle}
              >
                {user.isFollowing ? "Following" : "Follow"}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Name and Handle */}
        <div className="mt-3">
          <h2 className="font-display text-[22px] font-bold text-ink leading-tight">
            {user.displayName || user.username}
          </h2>
          <p className="text-[14px] text-ink-3">@{user.username}</p>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="mt-3 text-[14px] leading-6 text-ink-2 whitespace-pre-wrap">
            {user.bio}
          </p>
        )}

        {/* Meta / Joined */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px] text-ink-3">
          <span className="flex items-center gap-1.5">
            <Icon name="calendar" size={16} />
            <span>Joined {formatJoined(user.createdAt)}</span>
          </span>
        </div>

        {/* Follow counts */}
        <div className="mt-3 flex items-center gap-5 text-[14px]">
          <span>
            <strong className="font-bold text-ink">
              {formatCount(user.followingCount)}
            </strong>{" "}
            <span className="text-ink-3">Following</span>
          </span>
          <span>
            <strong className="font-bold text-ink">
              {formatCount(user.followersCount)}
            </strong>{" "}
            <span className="text-ink-3">Followers</span>
          </span>
        </div>
      </div>

      {/* Profile Tabs */}
      <Tabs
        label="Profile views"
        tabs={PROFILE_TABS}
        value={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab content */}
      <section aria-label={`${activeTab} list`}>
        {activeTab === "Posts" && (
          postsQuery.isLoading ? (
            <Spinner label="Loading posts…" />
          ) : posts.length === 0 ? (
            <EmptyState
              icon="spark"
              title="No posts yet"
              body={`@${user.username} hasn't posted anything yet.`}
            />
          ) : (
            <>
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
              <InfiniteSentinel
                hasMore={Boolean(postsQuery.hasNextPage)}
                loading={postsQuery.isFetchingNextPage}
                onVisible={() => postsQuery.fetchNextPage()}
              />
            </>
          )
        )}

        {activeTab === "Replies" && (
          repliesQuery.isLoading ? (
            <Spinner label="Loading replies…" />
          ) : replies.length === 0 ? (
            <EmptyState
              icon="reply"
              title="No replies yet"
              body={`@${user.username} hasn't replied to any posts yet.`}
            />
          ) : (
            <>
              {replies.map((reply) => (
                <ReplyItem key={reply._id} comment={reply} />
              ))}
              <InfiniteSentinel
                hasMore={Boolean(repliesQuery.hasNextPage)}
                loading={repliesQuery.isFetchingNextPage}
                onVisible={() => repliesQuery.fetchNextPage()}
              />
            </>
          )
        )}

        {activeTab === "Likes" && (
          likesQuery.isLoading ? (
            <Spinner label="Loading liked posts…" />
          ) : likes.length === 0 ? (
            <EmptyState
              icon="heart"
              title="No liked posts"
              body={`@${user.username} hasn't liked any posts yet.`}
            />
          ) : (
            <>
              {likes.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
              <InfiniteSentinel
                hasMore={Boolean(likesQuery.hasNextPage)}
                loading={likesQuery.isFetchingNextPage}
                onVisible={() => likesQuery.fetchNextPage()}
              />
            </>
          )
        )}
      </section>
    </AppShell>
  );
}
