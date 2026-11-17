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

  return (
    <AppShell>
      {/* Search Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur">
        <div className="flex h-11 items-center gap-2.5 rounded-pill bg-surface-2 px-4">
          <Icon name="search" size={18} className="text-ink-3" />
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
            <Spinner label="Searching…" />
          ) : search.data && search.data.length > 0 ? (
            <div className="divide-y divide-line px-4">
              {search.data.map((user) => (
                <UserRow key={user._id} user={user} showBio />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="search"
              title={`No users found for "${query}"`}
              body="Try searching by full display name or @username."
            />
          )}
        </section>
      ) : (
        <Feed tab="for-you" />
      )}
    </AppShell>
  );
}
