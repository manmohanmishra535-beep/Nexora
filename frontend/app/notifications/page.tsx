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
import { useToast } from "@/components/ui/Toast";
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
              aria-label={`${notification.actor.displayName}'s profile`}
              className="inline-block"
            >
              <Avatar
                src={notification.actor.profileImage?.url}
                name={notification.actor.displayName}
                size={32}
              />
            </Link>
          </div>
        )}

        <p className="text-[14px] leading-5 text-ink">
          {notification.actor ? (
            <Link
              href={`/${notification.actor.username}`}
              className="font-bold text-ink hover:underline"
            >
              {notification.actor.displayName || notification.actor.username}
            </Link>
          ) : (
            <span className="font-semibold text-ink">Someone</span>
          )}{" "}
          <span className="text-ink-2">{text}</span>{" "}
          <span className="text-ink-3">· {formatTimeAgo(notification.createdAt)}</span>
        </p>

        {notification.post && (
          <Link
            href={`/post/${notification.post._id}`}
            className="mt-2 block rounded-1 bg-surface-2/60 p-3 text-[13px] text-ink-2 hover:bg-surface-2"
          >
            <p className="line-clamp-2">{notification.post.content}</p>
          </Link>
        )}
      </div>
    </article>
  );
}

export default function NotificationsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const notificationsQuery = useNotifications();

  const markAll = useMutation({
    mutationFn: () => api.patch<{ success: boolean }>("/notifications/read"),
    onSuccess: () => {
      queryClient.setQueryData(["unread-count"], 0);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast("All notifications marked as read.");
    },
    onError: () => {
      toast("Couldn't update notifications.", "error");
    },
  });

  const notifications =
    notificationsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-5">
        <h1 className="font-display text-[19px] font-bold text-ink">
          Notifications
        </h1>

        {notifications.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        )}
      </header>

      {/* Content */}
      {notificationsQuery.isLoading ? (
        <Spinner label="Loading notifications…" />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No notifications yet"
          body="When people interact with you, like your posts, or follow you, you'll see it here."
        />
      ) : (
        <section aria-label="Notifications list">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
            />
          ))}

          <InfiniteSentinel
            hasMore={Boolean(notificationsQuery.hasNextPage)}
            loading={notificationsQuery.isFetchingNextPage}
            onVisible={() => notificationsQuery.fetchNextPage()}
          />
        </section>
      )}
    </AppShell>
  );
}
