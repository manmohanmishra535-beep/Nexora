"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Icon, { type IconName } from "@/components/ui/Icon";
import InfiniteSentinel from "@/components/ui/InfiniteSentinel";
import Spinner from "@/components/ui/Spinner";
import { useApi } from "@/hooks/useApi";
import { useNotifications } from "@/hooks/useNexora";
import { formatTimeAgo } from "@/lib/format";
import type { NotificationType } from "@/lib/types";

const icons: Record<NotificationType, IconName> = {
  like: "heart",
  repost: "repost",
  comment: "reply",
  follow: "user",
  message: "mail",
};

const copy: Record<NotificationType, string> = {
  like: "liked your post",
  repost: "reposted your post",
  comment: "replied to your post",
  follow: "followed you",
  message: "sent you a message",
};

export default function NotificationsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const notifications = useNotifications();
  const marked = useRef(false);

  const markRead = useMutation({
    mutationFn: () => api.patch("/notifications/read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const items = notifications.data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => {
    if (items.length > 0 && !marked.current) {
      marked.current = true;
      markRead.mutate();
    }
  }, [items.length, markRead]);

  return (
    <>
      <PageHeader title="Notifications" subtitle="Live, no refresh needed" />

      {notifications.isLoading ? (
        <Spinner label="Loading notifications" />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bell"
          title="Nothing yet"
          body="Likes, replies, reposts, follows and messages will show up here the moment they happen."
        />
      ) : (
        <section aria-label="Notifications" className="divide-y divide-line">
          {items.map((notification) => {
            const actor = notification.actor;
            const href = notification.post
              ? `/post/${notification.post._id}`
              : actor
                ? `/${actor.username}`
                : "/explore";

            return (
              <Link
                key={notification._id}
                href={href}
                className={`flex gap-3 px-4 py-4 transition-colors duration-hover hover:bg-surface-2/60 sm:px-5 ${
                  notification.read ? "" : "bg-accent-soft/40"
                }`}
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon name={icons[notification.type]} size={18} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={actor?.profileImage?.url}
                      name={actor?.displayName || "N"}
                      size={32}
                    />

                    <p className="min-w-0 flex-1 text-[14px] leading-6 text-ink">
                      <b className="font-display font-bold">
                        {actor?.displayName || "Someone"}
                      </b>{" "}
                      {copy[notification.type]}
                    </p>

                    <span className="shrink-0 text-[12px] text-ink-3">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>

                  {notification.post?.content && (
                    <p className="mt-1 line-clamp-2 pl-10 text-[13px] leading-5 text-ink-2">
                      {notification.post.content}
                    </p>
                  )}

                  {!notification.read && (
                    <span className="mt-2 ml-10 inline-block h-2 w-2 rounded-full bg-accent" />
                  )}
                </div>
              </Link>
            );
          })}

          <InfiniteSentinel
            hasMore={Boolean(notifications.hasNextPage)}
            loading={notifications.isFetchingNextPage}
            onVisible={() => notifications.fetchNextPage()}
          />
        </section>
      )}
    </>
  );
}
