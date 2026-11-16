"use client";

import Link from "next/link";

import EmptyState from "@/components/EmptyState";
import PostCard from "@/components/PostCard";
import Button from "@/components/ui/Button";
import InfiniteSentinel from "@/components/ui/InfiniteSentinel";
import Spinner from "@/components/ui/Spinner";
import { useFeed, type FeedTab } from "@/hooks/useNexora";

export default function Feed({ tab }: { tab: FeedTab }) {
  const feed = useFeed(tab);
  const posts =
    feed.data?.pages.flatMap((page) => page.items) ?? [];

  if (feed.isLoading) {
    return <Spinner label="Loading posts" />;
  }

  if (feed.isError) {
    return (
      <EmptyState
        icon="spark"
        title="The feed didn't load"
        body="The API may be waking up. Check that the backend is running, then try again."
        action={
          <Button variant="secondary" size="sm" onClick={() => feed.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (posts.length === 0) {
    return tab === "following" ? (
      <EmptyState
        icon="user"
        title="Your Following feed is quiet"
        body="Follow a few people from Explore and their newest posts will land here, next to your own."
        action={
          <Link
            href="/explore"
            className="flex h-8 items-center rounded-pill bg-accent px-3.5 text-[13px] font-semibold text-on-accent"
          >
            Find people
          </Link>
        }
      />
    ) : (
      <EmptyState
        icon="spark"
        title="Your feed starts here"
        body="No posts yet. Be the first to share something with the Nexora community."
      />
    );
  }

  return (
    <section aria-label={tab === "following" ? "Following feed" : "For you feed"}>
      {posts.map((post) => (
        <PostCard key={post._id} post={post} />
      ))}

      <InfiniteSentinel
        hasMore={Boolean(feed.hasNextPage)}
        loading={feed.isFetchingNextPage}
        onVisible={() => feed.fetchNextPage()}
      />
    </section>
  );
}
