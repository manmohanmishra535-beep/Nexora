"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon, { type IconName } from "@/components/ui/Icon";
import InfiniteSentinel from "@/components/ui/InfiniteSentinel";
import Spinner from "@/components/ui/Spinner";
import { useApi } from "@/hooks/useApi";
import { useNotifications } from "@/hooks/useNexora";
import { formatTimeAgo } from "@/lib/format";
import type { Notification, NotificationType } from "@/lib/types";

const ICONS: Record<NotificationType, { name: IconName; color: string }> = {
  like: { name: "heart", color: "text-like" },
  repost: { name: "repost", color: "text-accent" },
  comment: { name: "reply", color: "text-accent" },
  follow: { name: "user", color: "text-accent" },
  message: { name: "mail", color: "text-accent" },
};

const MESSAGES: Record<NotificationType, string> = {
  like: "liked your post",
  repost: "reposted your post",
  comment: "replied to your post",
  follow: "followed you",
  message: "sent you a message",
};

function NotificationItem({ notification }: { notification: Notification }) {
  const meta = ICONS[notification.type] || { name: "bell", color: "text-accent" };
  const text = MESSAGES[notification.type] || "interacted with you";

  return (
    <article className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 border-b border-line px-4 py-4 transition-colors hover:bg-surface-2/40 sm:px-5">
      <div className="flex justify-end pt-0.5">
        <Icon name={meta.name} size={20} className={meta.color} />
      </div>

      <div className="min-w-0">
        {notification.actor && (
          <div className="mb-2">
            <Link
              href={`/${notification.actor.username}`}
              className="inline-block rounded-full"
            >
              <Avatar
                src={notification.actor.profileImage?.url}
                name={notification.actor.displayName}
                size={32}
              />
            </Link>
          </div>
        )}

        <div className="text-[14px] leading-5 text-ink">
          {notification.actor ? (
            <Link
              href={`/${notification.actor.username}`}
              className="font-bold hover:underline"
            >
              {notification.actor.displayName}{" "}
            </Link>
          ) : (
            <span className="font-bold">Someone </span>
          )}
          <span className="text-ink-2">{text}</span>
          <span aria-hidden="true" className="mx-1 text-ink-3">
            ·
          </span>
          <time className="text-[12px] text-ink-3">
            {formatTimeAgo(notification.createdAt)}
          </time>
        </div>

        {notification.post && (
          <Link
            href={`/post/${notification.post._id}`}
            className="mt-2 block rounded-1 border border-line bg-surface-2/60 p-2.5 text-[13px] leading-5 text-ink-2 hover:bg-surface-2"
          >
            {notification.post.content || "View post"}
          </Link>
        )}
      </div>
    </article>
  );
}

export default function NotificationsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const notifications = useNotifications();

  const markAllRead = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const items =
    notifications.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <AppShell>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-5">
        <h1 className="font-display text-[20px] font-bold text-ink">
          Notifications
        </h1>

        {items.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            Mark all read
          </Button>
        )}
      </header>

      {notifications.isLoading ? (
        <Spinner label="Loading notifications…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No notifications yet"
          body="When someone likes, replies to, or reposts your updates, you'll see it here."
        />
      ) : (
        <section aria-label="Notifications list">
          {items.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
            />
          ))}

          <InfiniteSentinel
            hasMore={Boolean(notifications.hasNextPage)}
            loading={notifications.isFetchingNextPage}
            onVisible={() => notifications.fetchNextPage()}
          />
        </section>
      )}
    </AppShell>
  );
}
