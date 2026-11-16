"use client";

import Link from "next/link";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import PostCard from "@/components/PostCard";
import InfiniteSentinel from "@/components/ui/InfiniteSentinel";
import Spinner from "@/components/ui/Spinner";
import { useBookmarks } from "@/hooks/useNexora";

export default function BookmarksPage() {
  const bookmarks = useBookmarks();
  const items = bookmarks.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <PageHeader
        title="Bookmarks"
        subtitle="Private to you, never shown on your profile"
      />

      {bookmarks.isLoading ? (
        <Spinner label="Loading bookmarks" />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="Save posts for later"
          body="Tap the bookmark icon on any post and it will wait for you here."
          action={
            <Link
              href="/"
              className="flex h-8 items-center rounded-pill bg-accent px-3.5 text-[13px] font-semibold text-on-accent"
            >
              Back to feed
            </Link>
          }
        />
      ) : (
        <section aria-label="Bookmarked posts">
          {items.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}

          <InfiniteSentinel
            hasMore={Boolean(bookmarks.hasNextPage)}
            loading={bookmarks.isFetchingNextPage}
            onVisible={() => bookmarks.fetchNextPage()}
          />
        </section>
      )}
    </>
  );
}
