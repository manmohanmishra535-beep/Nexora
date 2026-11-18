"use client";

import { useEffect, useRef } from "react";

import { InlineSpinner } from "./Spinner";

/**
 * The sentinel sits at the bottom of an infinite list. It fetches the next
 * page when it is 400px from the viewport, as the frontend spec asks.
 */
export default function InfiniteSentinel({
  onVisible,
  hasMore,
  loading,
  endLabel = "You're all caught up.",
}: {
  onVisible: () => void;
  hasMore: boolean;
  loading: boolean;
  endLabel?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const callback = useRef(onVisible);

  useEffect(() => {
    callback.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    const node = ref.current;

    if (!node || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) {
          callback.current();
        }
      },
      { rootMargin: "400px 0px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [hasMore, loading]);

  if (!hasMore && !loading) {
    return (
      <p className="py-10 text-center text-[13px] text-ink-3">{endLabel}</p>
    );
  }

  return (
    <div ref={ref} className="py-6">
      {loading && (
        <div className="flex justify-center">
          <InlineSpinner />
        </div>
      )}
    </div>
  );
}
