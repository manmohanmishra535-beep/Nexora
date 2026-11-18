"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Icon from "@/components/ui/Icon";
import UserRow from "@/components/UserRow";
import { useSuggestions } from "@/hooks/useNexora";

export default function RightRail({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const suggestions = useSuggestions(signedIn);

  return (
    <div className="sticky top-0 flex flex-col gap-4 px-5 py-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const query = term.trim();

          if (query) {
            router.push(`/explore?q=${encodeURIComponent(query)}`);
          }
        }}
        className="flex h-11 items-center gap-2.5 rounded-pill bg-surface-2 px-4"
        role="search"
      >
        <Icon name="search" size={18} className="text-ink-3" />

        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search Nexora"
          aria-label="Search Nexora"
          className="h-full w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
        />
      </form>

      {signedIn && (
        <section
          aria-labelledby="who-to-follow"
          className="rounded-2 border border-line bg-surface p-4"
        >
          <h2
            id="who-to-follow"
            className="font-display text-[18px] font-bold text-ink"
          >
            Who to follow
          </h2>

          <div className="mt-1 divide-y divide-line">
            {suggestions.isLoading && (
              <p className="py-6 text-center text-[13px] text-ink-3">
                Finding people…
              </p>
            )}

            {suggestions.data?.map((user) => (
              <UserRow key={user._id} user={user} />
            ))}

            {suggestions.data?.length === 0 && (
              <p className="py-6 text-[13px] leading-6 text-ink-3">
                You are following everyone on Nexora. Invite someone new.
              </p>
            )}
          </div>

          <Link
            href="/explore"
            className="mt-2 inline-block text-[13px] font-semibold text-accent hover:underline"
          >
            Show more
          </Link>
        </section>
      )}

      {!signedIn && (
        <section className="rounded-2 border border-line bg-surface p-4">
          <h2 className="font-display text-[18px] font-bold text-ink">
            New to Nexora?
          </h2>

          <p className="mt-2 text-[13px] leading-6 text-ink-2">
            Sign up to post, follow people and get live notifications.
          </p>

          <Link
            href="/sign-up"
            className="mt-3 flex h-8 items-center justify-center rounded-pill bg-accent px-3.5 text-[13px] font-semibold text-on-accent transition-opacity duration-hover hover:opacity-90"
          >
            Create account
          </Link>
        </section>
      )}

      <footer className="px-1 text-[13px] leading-6 text-ink-3">
        Nexora Design System · v1.0
        <br />
        Tokens mirror frontend/app/tokens.css
      </footer>
    </div>
  );
}
