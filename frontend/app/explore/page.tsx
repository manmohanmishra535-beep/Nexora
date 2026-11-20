"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import Feed from "@/components/Feed";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import UserRow from "@/components/UserRow";
import { useSearchUsers } from "@/hooks/useNexora";

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);

  const search = useSearchUsers(query);
  const isSearching = query.trim().length > 0;
  const users = search.data || [];

  return (
    <AppShell>
      {/* Search Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur">
        <div className="flex h-11 items-center gap-2.5 rounded-pill bg-surface-2 px-4">
          <Icon name="search" size={18} className="text-ink-3 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users on Nexora…"
            aria-label="Search users"
            className="h-full w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="grid h-6 w-6 place-items-center rounded-full text-ink-3 hover:bg-surface hover:text-ink"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      {isSearching ? (
        <section aria-label="Search results" className="divide-y divide-line">
          {search.isLoading ? (
            <Spinner label="Searching users…" />
          ) : users.length === 0 ? (
            <EmptyState
              icon="search"
              title={`No results for "${query}"`}
              body="Try searching for another username or name to connect with people."
            />
          ) : (
            users.map((user) => (
              <div key={user._id} className="px-4">
                <UserRow user={user} showBio />
              </div>
            ))
          )}
        </section>
      ) : (
        <section aria-label="Explore Feed">
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-display text-[16px] font-bold text-ink">
              Discover Posts
            </h2>
            <p className="text-[13px] text-ink-3">
              Recent posts from creators across Nexora
            </p>
          </div>
          <Feed tab="for-you" />
        </section>
      )}
    </AppShell>
  );
}
