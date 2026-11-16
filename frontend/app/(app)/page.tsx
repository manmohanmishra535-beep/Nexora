"use client";

import { useState } from "react";

import Composer from "@/components/Composer";
import Feed from "@/components/Feed";
import PageHeader from "@/components/PageHeader";
import Tabs from "@/components/ui/Tabs";
import type { FeedTab } from "@/hooks/useNexora";

const TABS: readonly FeedTab[] = ["for-you", "following"];
const LABELS: Record<FeedTab, string> = {
  "for-you": "For you",
  following: "Following",
};

export default function HomePage() {
  const [tab, setTab] = useState<FeedTab>("for-you");

  return (
    <>
      <PageHeader title="Home" />

      <div className="sticky top-[109px] z-20 bg-surface min-[720px]:top-[53px]">
        <Tabs
          tabs={TABS.map((value) => LABELS[value])}
          value={LABELS[tab]}
          onChange={(label) => {
            const next = TABS.find((value) => LABELS[value] === label);
            if (next) setTab(next);
          }}
          label="Home feed"
        />
      </div>

      <Composer />

      <Feed tab={tab} />
    </>
  );
}
