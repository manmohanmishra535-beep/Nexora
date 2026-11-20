"use client";

import { useEffect, useState } from "react";

import EmptyState from "@/components/EmptyState";
import Feed from "@/components/Feed";
import PageHeader from "@/components/PageHeader";
import UserRow from "@/components/UserRow";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import { useSearchUsers, useSuggestions } from "@/hooks/useNexora";

export default function ExplorePage() {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(term.trim()), 250);

    return () => clearTimeout(timer);
  }, [term]);

  const results = useSearchUsers(query);
  const suggestions = useSuggestions();

  return (
    <>
      <PageHeader title="Explore" />

      <div className="sticky top-[109px] z-20 border-b border-line bg-surface px-4 py-3 min-[720px]:top-[53px] sm:px-5">
        <div className="flex h-11 items-center gap-2.5 rounded-pill bg-surface-2 px-4">
          <Icon name="search" size={18} className="text-ink-3" />

          <label htmlFor="explore-search" className="sr-only">
            Search people
          </label>

          <input
            id="explore-search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search people by name or @username"
            autoComplete="off"
            className="h-full w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
      </div>

      {query ? (
        <section aria-label="Search results">
          {results.isLoading && <Spinner label="Searching" />}

          {results.isError && (
            <p className="px-5 py-10 text-center text-[13px] text-danger">
              Search failed. Try again in a moment.
            </p>
          )}

          {results.data?.length === 0 && (
            <EmptyState
              icon="search"
              title="No people found"
              body={`Nobody matches "${query}". Try a shorter name or a username without the @.`}
            />
          )}

          {results.data && results.data.length > 0 && (
            <div className="divide-y divide-line px-4 sm:px-5">
              {results.data.map((user) => (
                <UserRow key={user._id} user={user} showBio />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section
            aria-labelledby="suggested-people"
            className="border-b border-line px-4 py-4 sm:px-5"
          >
            <h2
              id="suggested-people"
              className="font-display text-[18px] font-bold text-ink"
            >
              Suggested for you
            </h2>

            <div className="mt-1 divide-y divide-line">
              {suggestions.data?.map((user) => (
                <UserRow key={user._id} user={user} showBio />
              ))}

              {suggestions.data?.length === 0 && (
                <p className="py-4 text-[13px] text-ink-3">
                  No suggestions right now. Check back after more people join.
                </p>
              )}
            </div>
          </section>

          <Feed tab="for-you" />
        </>
      )}
    </>
  );
}
