"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import PostCard from "@/components/PostCard";
import ProfileHeader from "@/components/ProfileHeader";
import Avatar from "@/components/ui/Avatar";
import InfiniteSentinel from "@/components/ui/InfiniteSentinel";
import Spinner from "@/components/ui/Spinner";
import Tabs from "@/components/ui/Tabs";
import {
  useLikedPosts,
  useProfile,
  useUserPosts,
  useUserReplies,
} from "@/hooks/useNexora";
import { formatTimeAgo } from "@/lib/format";
import type { Comment } from "@/lib/types";

const TABS = ["Posts", "Replies", "Likes"] as const;

type ProfileTab = (typeof TABS)[number];

function ReplyCard({ reply }: { reply: Comment }) {
  const author = reply.author;
  const parent = reply.post;

  return (
    <article className="border-b border-line px-4 py-4 transition-colors duration-hover hover:bg-surface-2/50 sm:px-5">
      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3">
        <Link
          href={author ? `/${author.username}` : "/"}
          aria-label={author ? `${author.displayName} profile` : "Profile"}
          className="h-11 w-11 rounded-full"
        >
          <Avatar
            src={author?.profileImage?.url}
            name={author?.displayName || "Nexora User"}
            size={44}
          />
        </Link>

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link
              href={author ? `/${author.username}` : "/"}
              className="truncate font-display text-[15px] font-bold text-ink hover:underline"
            >
              {author?.displayName || "Nexora User"}
            </Link>

            <span className="truncate text-[13px] text-ink-3">
              @{author?.username || "user"}
            </span>

            <span aria-hidden="true" className="text-ink-3">
              ·
            </span>

            <span className="text-[13px] text-ink-3">
              {formatTimeAgo(reply.createdAt)}
            </span>
          </div>

          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-[1.55] text-ink">
            {reply.content}
          </p>

          {parent && (
            <Link
              href={`/post/${parent._id}`}
              className="mt-3 block rounded-2 border border-line p-3 transition-colors duration-hover hover:bg-surface-2"
            >
              <div className="flex items-center gap-2">
                <Avatar
                  src={parent.author?.profileImage?.url}
                  name={parent.author?.displayName || "Nexora User"}
                  size={32}
                />

                <span className="truncate text-[13px] font-semibold text-ink">
                  {parent.author?.displayName || "Nexora User"}
                </span>

                <span className="truncate text-[12px] text-ink-3">
                  @{parent.author?.username || "user"}
                </span>
              </div>

              {parent.content && (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-[13px] leading-5 text-ink-2">
                  {parent.content}
                </p>
              )}

              {parent.images?.length > 0 && (
                <p className="mt-2 text-[12px] text-ink-3">
                  {parent.images.length}{" "}
                  {parent.images.length === 1 ? "image" : "images"} attached
                </p>
              )}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const username = String(params.username ?? "");
  const [tab, setTab] = useState<ProfileTab>("Posts");

  const profile = useProfile(username);
  const posts = useUserPosts(username);
  const replies = useUserReplies(username);
  const likes = useLikedPosts(username);

  if (profile.isLoading) {
    return (
      <>
        <PageHeader title="Profile" back />
        <Spinner label="Loading profile" />
      </>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <>
        <PageHeader title="Profile" back />

        <EmptyState
          icon="user"
          title="This profile isn't here"
          body={`Nobody on Nexora matches @${username}. The account may have been renamed or deleted.`}
          action={
            <Link
              href="/explore"
              className="flex h-8 items-center rounded-pill bg-accent px-3.5 text-[13px] font-semibold text-on-accent"
            >
              Find people
            </Link>
          }
        />
      </>
    );
  }

  const user = profile.data;

  const postItems = posts.data?.pages.flatMap((page) => page.items) ?? [];
  const replyItems = replies.data?.pages.flatMap((page) => page.items) ?? [];
  const likedItems = likes.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <PageHeader title={user.displayName} subtitle={`@${user.username}`} back />

      <ProfileHeader user={user} />

      <div className="sticky top-[109px] z-20 bg-surface min-[720px]:top-[53px]">
        <Tabs
          tabs={TABS}
          value={tab}
          onChange={setTab}
          label={`${user.displayName} profile sections`}
        />
      </div>

      {tab === "Posts" && (
        <section aria-label={`${user.displayName} posts`}>
          {posts.isLoading ? (
            <Spinner label="Loading posts" />
          ) : posts.isError ? (
            <EmptyState
              icon="spark"
              title="Posts didn't load"
              body="The profile is fine, but the posts request failed. Try again."
            />
          ) : postItems.length === 0 ? (
            <EmptyState
              icon="spark"
              title="No posts yet"
              body={
                user.isMe
                  ? "Your posts will live here. Share your first thought from the home feed."
                  : `${user.displayName} hasn't posted yet. Check back soon.`
              }
            />
          ) : (
            <>
              {postItems.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}

              <InfiniteSentinel
                hasMore={Boolean(posts.hasNextPage)}
                loading={posts.isFetchingNextPage}
                onVisible={() => posts.fetchNextPage()}
              />
            </>
          )}
        </section>
      )}

      {tab === "Replies" && (
        <section aria-label={`${user.displayName} replies`}>
          {replies.isLoading ? (
            <Spinner label="Loading replies" />
          ) : replies.isError ? (
            <EmptyState
              icon="reply"
              title="Replies didn't load"
              body="The profile is fine, but the replies request failed. Try again."
            />
          ) : replyItems.length === 0 ? (
            <EmptyState
              icon="reply"
              title="No replies yet"
              body={
                user.isMe
                  ? "Replies you write on other posts will appear here."
                  : `${user.displayName} hasn't replied to anyone yet.`
              }
            />
          ) : (
            <>
              {replyItems.map((reply) => (
                <ReplyCard key={reply._id} reply={reply} />
              ))}

              <InfiniteSentinel
                hasMore={Boolean(replies.hasNextPage)}
                loading={replies.isFetchingNextPage}
                onVisible={() => replies.fetchNextPage()}
              />
            </>
          )}
        </section>
      )}

      {tab === "Likes" && (
        <section aria-label={`${user.displayName} likes`}>
          {likes.isLoading ? (
            <Spinner label="Loading likes" />
          ) : likes.isError ? (
            <EmptyState
              icon="heart"
              title="Likes didn't load"
              body="The profile is fine, but the likes request failed. Try again."
            />
          ) : likedItems.length === 0 ? (
            <EmptyState
              icon="heart"
              title="No likes yet"
              body={
                user.isMe
                  ? "Posts you like will be collected here, visible only to you unless this profile is public."
                  : `${user.displayName} hasn't liked any posts yet.`
              }
            />
          ) : (
            <>
              {likedItems.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}

              <InfiniteSentinel
                hasMore={Boolean(likes.hasNextPage)}
                loading={likes.isFetchingNextPage}
                onVisible={() => likes.fetchNextPage()}
              />
            </>
          )}
        </section>
      )}
    </>
  );
}
