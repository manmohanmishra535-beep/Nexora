"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

import AppShell from "@/components/AppShell";
import Composer from "@/components/Composer";
import Feed from "@/components/Feed";
import Button from "@/components/ui/Button";
import { type FeedTab } from "@/hooks/useNexora";
import { cn } from "@/lib/cn";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const [tab, setTab] = useState<FeedTab>("for-you");

  if (!isLoaded) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg text-[13px] text-ink-3">
        Loading Nexora…
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-bg">
        <div className="mx-auto flex max-w-[1200px] flex-col px-5 py-10 lg:flex-row lg:items-center lg:justify-between lg:py-24">
          {/* Hero Left */}
          <div className="flex max-w-[500px] flex-col">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
              <span className="h-4 w-4 rounded-full bg-accent" />
            </div>

            <h1 className="mt-8 font-display text-[44px] font-bold tracking-[-.02em] text-ink sm:text-[56px] leading-[1.08]">
              Happening now.
            </h1>

            <p className="mt-3 font-display text-[24px] font-bold text-ink-2">
              Join Nexora today.
            </p>

            <p className="mt-4 text-[15px] leading-7 text-ink-3">
              Follow voices you care about, share 280-character thoughts with images, and catch updates in real time.
            </p>

            <div className="mt-8 flex max-w-[340px] flex-col gap-3">
              <Link href="/sign-up">
                <Button block size="md" className="h-11 text-[15px]">
                  Create account
                </Button>
              </Link>

              <Link href="/sign-in">
                <Button block variant="secondary" size="md" className="h-11 text-[15px]">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>

          {/* Feed Preview Right */}
          <div className="mt-12 w-full max-w-[560px] overflow-hidden rounded-2 border border-line bg-surface shadow-sm lg:mt-0">
            <div className="border-b border-line bg-surface/90 px-5 py-3 backdrop-blur">
              <h2 className="font-display text-[16px] font-bold text-ink">
                Explore what's happening
              </h2>
              <p className="text-[13px] text-ink-3">Trending thoughts from the community</p>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              <Feed tab="for-you" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex h-14 items-center px-4">
          <h1 className="font-display text-[19px] font-bold text-ink">Home</h1>
        </div>

        {/* Tab selection */}
        <div className="flex border-t border-line">
          <button
            type="button"
            onClick={() => setTab("for-you")}
            className={cn(
              "relative flex-1 py-3 text-center font-display text-[14px] font-semibold transition-colors hover:bg-surface-2",
              tab === "for-you" ? "text-ink" : "text-ink-3"
            )}
          >
            For you
            {tab === "for-you" && (
              <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-pill bg-accent" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("following")}
            className={cn(
              "relative flex-1 py-3 text-center font-display text-[14px] font-semibold transition-colors hover:bg-surface-2",
              tab === "following" ? "text-ink" : "text-ink-3"
            )}
          >
            Following
            {tab === "following" && (
              <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-pill bg-accent" />
            )}
          </button>
        </div>
      </header>

      {/* Composer */}
      <section aria-label="Create a post" className="border-b border-line">
        <Composer variant="feed" />
      </section>

      {/* Posts */}
      <Feed tab={tab} />
    </AppShell>
  );
}
