
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
            <main className="grid min-h-screen place-items-center bg-bg px-5 py-12">
                <div className="flex max-w-[420px] flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <span className="h-4 w-4 rounded-full bg-accent" />
                    </div>

                    <h1 className="mt-6 font-display text-[38px] font-bold tracking-[-.02em] text-ink sm:text-[44px]">
                        Happening now.
                    </h1>

                    <p className="mt-2 text-[17px] font-medium text-ink-2">
                        Join Nexora today.
                    </p>

                    <p className="mt-3 text-[14px] leading-6 text-ink-3">
                        Follow voices you care about, post 280-character thoughts, and catch updates in real time.
                    </p>

                    <div className="mt-8 flex w-full flex-col gap-3">
                        <Link href="/sign-up">
                            <Button block className="h-11">
                                Create account
                            </Button>
                        </Link>

                        <Link href="/sign-in">
                            <Button variant="secondary" block className="h-11">
                                Sign in
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <AppShell>
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
        </AppShell>
    );
}
