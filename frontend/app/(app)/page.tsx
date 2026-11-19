"use client";

import { useState } from "react";

import Composer from "@/components/Composer";
import Feed from "@/components/Feed";
import { type FeedTab } from "@/hooks/useNexora";
import { cn } from "@/lib/cn";

export default function HomePage() {
  const [tab, setTab] = useState<FeedTab>("for-you");

  return (
    <>
      {/* Feed Tabs Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-line bg-surface/95 backdrop-blur">
        <button
          type="button"
          onClick={() => setTab("for-you")}
          className={cn(
            "relative flex h-full flex-1 items-center justify-center font-display text-[15px] transition-colors duration-hover hover:bg-surface-2",
            tab === "for-you" ? "font-bold text-ink" : "font-medium text-ink-3"
          )}
        >
          For you
          {tab === "for-you" && (
            <span className="absolute bottom-0 h-1 w-14 rounded-full bg-accent" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab("following")}
          className={cn(
            "relative flex h-full flex-1 items-center justify-center font-display text-[15px] transition-colors duration-hover hover:bg-surface-2",
            tab === "following" ? "font-bold text-ink" : "font-medium text-ink-3"
          )}
        >
          Following
          {tab === "following" && (
            <span className="absolute bottom-0 h-1 w-14 rounded-full bg-accent" />
          )}
        </button>
      </header>

      {/* Post Composer */}
      <Composer />

      {/* Post Feed */}
      <Feed tab={tab} />
    </>
  );
}
