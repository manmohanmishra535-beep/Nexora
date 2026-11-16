"use client";

import EmptyState from "@/components/EmptyState";
import UserRow from "@/components/UserRow";
import InfiniteSentinel from "@/components/ui/InfiniteSentinel";
import Spinner from "@/components/ui/Spinner";
import { useRelation } from "@/hooks/useNexora";

export default function RelationList({
  username,
  field,
}: {
  username: string;
  field: "followers" | "following";
}) {
  const relation = useRelation(username, field);
  const items = relation.data?.pages.flatMap((page) => page.items) ?? [];

  if (relation.isLoading) {
    return <Spinner label={`Loading ${field}`} />;
  }

  if (relation.isError) {
    return (
      <EmptyState
        icon="user"
        title={`${field[0].toUpperCase()}${field.slice(1)} didn't load`}
        body="The list request failed. The profile may have been renamed or the API may be waking up."
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="user"
        title={field === "followers" ? "No followers yet" : "Not following anyone yet"}
        body={
          field === "followers"
            ? `Nobody follows @${username} yet. Share the profile to get the first one.`
            : `@${username} hasn't followed anyone yet. Explore Nexora to find people worth following.`
        }
      />
    );
  }

  return (
    <section aria-label={field} className="px-4 sm:px-5">
      <div className="divide-y divide-line">
        {items.map((user) => (
          <UserRow key={user._id} user={user} showBio />
        ))}
      </div>

      <InfiniteSentinel
        hasMore={Boolean(relation.hasNextPage)}
        loading={relation.isFetchingNextPage}
        onVisible={() => relation.fetchNextPage()}
      />
    </section>
  );
}
