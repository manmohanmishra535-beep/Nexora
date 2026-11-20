"use client";

import Link from "next/link";

import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import PostCard from "@/components/PostCard";
import Button from "@/components/ui/Button";
import InfiniteSentinel from "@/components/ui/InfiniteSentinel";
import Spinner from "@/components/ui/Spinner";
import { useBookmarks } from "@/hooks/useNexora";

export default function BookmarksPage() {
  const bookmarksQuery = useBookmarks();
  const posts =
    bookmarksQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:px-5">
        <h1 className="font-display text-[19px] font-bold text-ink">
          Bookmarks
        </h1>
        <p className="text-[13px] text-ink-3">Saved posts for later</p>
      </header>

      {/* Content */}
      {bookmarksQuery.isLoading ? (
        <Spinner label="Loading bookmarks…" />
      ) : bookmarksQuery.isError ? (
        <EmptyState
          icon="bookmark"
          title="Couldn't load bookmarks"
          body="Check your internet connection and verify that the backend server is running."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => bookmarksQuery.refetch()}
            >
              Try again
            </Button>
          }
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="Save posts for later"
          body="Don't let the good ones fly away! Bookmark posts to easily find them again anytime."
          action={
            <Link href="/">
              <Button size="sm">Explore feed</Button>
            </Link>
          }
        />
      ) : (
        <section aria-label="Bookmarked posts">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}

          <InfiniteSentinel
            hasMore={Boolean(bookmarksQuery.hasNextPage)}
            loading={bookmarksQuery.isFetchingNextPage}
            onVisible={() => bookmarksQuery.fetchNextPage()}
          />
        </section>
      )}
    </AppShell>
  );
}
