"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import PageHeader from "@/components/PageHeader";
import { useSocket } from "@/components/RealtimeProvider";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import InfiniteSentinel from "@/components/ui/InfiniteSentinel";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useApi } from "@/hooks/useApi";
import {
  useConversations,
  useMessages,
  useMyProfile,
} from "@/hooks/useNexora";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { absoluteTime, formatTimeAgo } from "@/lib/format";
import type { Message } from "@/lib/types";

const dayLabel = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export default function MessageThreadPage() {
  const params = useParams();
  const conversationId = String(params.id ?? "");

  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const conversations = useConversations();
  const me = useMyProfile();
  const messages = useMessages(conversationId);
  const socket = useSocket();

  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentAt = useRef(0);

  const conversation = conversations.data?.find(
    (item) => item._id === conversationId
  );

  const person = conversation
    ? conversation.participants.find(
        (participant) => participant._id !== me.data?._id
      ) || conversation.participants[0]
    : undefined;

  // Newest page first, so reverse everything into chronological order.
  const items: Message[] = (
    messages.data?.pages.flatMap((page) => page.items) ?? []
  )
    .slice()
    .reverse();

  const send = useMutation({
    mutationFn: (value: string) =>
      api.post(`/conversations/${conversationId}/messages`, { text: value }),

    onMutate: (value) => {
      setText("");
      return { value };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },

    onError: (error, _value, context) => {
      if (context?.value) {
        setText(context.value);
      }

      toast(
        error instanceof ApiError ? error.message : "Couldn't send that message.",
        "error"
      );
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [items.length, conversationId]);

  const stopTyping = () => {
    if (!socket) {
      return;
    }

    socket.emit("typing:stop", { conversationId });
    typingSentAt.current = 0;
  };

  const noteTyping = () => {
    if (!socket) {
      return;
    }

    const now = Date.now();

    if (now - typingSentAt.current > 1500) {
      typingSentAt.current = now;
      socket.emit("typing:start", { conversationId });
    }

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    typingTimer.current = setTimeout(stopTyping, 2000);
  };

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onStart = (payload: { conversationId?: string }) => {
      if (payload?.conversationId === conversationId) {
        setTyping(true);
      }
    };

    const onStop = (payload: { conversationId?: string }) => {
      if (payload?.conversationId === conversationId) {
        setTyping(false);
      }
    };

    socket.on("typing:start", onStart);
    socket.on("typing:stop", onStop);

    return () => {
      socket.off("typing:start", onStart);
      socket.off("typing:stop", onStop);
    };
  }, [socket, conversationId]);

  useEffect(
    () => () => {
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }

      socket?.emit("typing:stop", { conversationId });
    },
    [socket, conversationId]
  );

  const submit = () => {
    const value = text.trim();

    if (!value || send.isPending || value.length > 1000) {
      return;
    }

    stopTyping();
    send.mutate(value);
  };

  const left = 1000 - text.length;

  return (
    <>
      <PageHeader
        title={person?.displayName || "Conversation"}
        subtitle={
          typing ? "typing…" : person ? `@${person.username}` : "Private messages"
        }
        back
        action={
          person ? (
            <Link
              href={`/${person.username}`}
              aria-label={`Open ${person.displayName}'s profile`}
              className="rounded-full"
            >
              <Avatar
                src={person.profileImage?.url}
                name={person.displayName}
                size={32}
              />
            </Link>
          ) : undefined
        }
      />

      {messages.isLoading ? (
        <Spinner label="Loading messages" />
      ) : messages.isError ? (
        <p className="px-5 py-10 text-center text-[13px] text-danger">
          Couldn&apos;t load this conversation. It may no longer exist.
        </p>
      ) : items.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon name="mail" size={26} />
          </div>

          <h2 className="mt-5 font-display text-[22px] font-bold text-ink">
            Say hello
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-ink-2">
            {person
              ? `This is the start of your conversation with ${person.displayName}.`
              : "This is the start of your conversation."}
          </p>
        </div>
      ) : (
        <section aria-label="Messages" className="px-4 py-4 sm:px-5">
          <InfiniteSentinel
            hasMore={Boolean(messages.hasNextPage)}
            loading={messages.isFetchingNextPage}
            onVisible={() => messages.fetchNextPage()}
            endLabel=""
          />

          {items.map((message, index) => {
            const mine = message.sender?._id === me.data?._id;
            const previous = index > 0 ? items[index - 1] : null;
            const newDay =
              !previous ||
              new Date(previous.createdAt).toDateString() !==
                new Date(message.createdAt).toDateString();

            return (
              <div key={message._id}>
                {newDay && (
                  <p className="my-4 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                    {dayLabel(message.createdAt)}
                  </p>
                )}

                <div
                  className={cn(
                    "mb-2 flex max-w-[85%] flex-col",
                    mine ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div
                    className={cn(
                      "whitespace-pre-wrap break-words rounded-3 px-3.5 py-2 text-[14px] leading-6",
                      mine
                        ? "rounded-br-1 bg-accent text-on-accent"
                        : "rounded-bl-1 bg-surface-2 text-ink"
                    )}
                  >
                    {message.text}
                  </div>

                  <span
                    title={absoluteTime(message.createdAt)}
                    className="mt-1 text-[11px] text-ink-3"
                  >
                    {formatTimeAgo(message.createdAt)}
                    {mine && message.readAt ? " · Read" : ""}
                  </span>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </section>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="sticky bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur min-[720px]:bottom-0 sm:px-5"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="message" className="sr-only">
            Write a message
          </label>

          <textarea
            id="message"
            value={text}
            rows={1}
            maxLength={1000}
            placeholder="Start a new message"
            onChange={(event) => {
              const value = event.target.value;
              setText(value);

              if (value.trim()) {
                noteTyping();
              } else {
                stopTyping();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            className="max-h-32 min-h-11 flex-1 resize-y rounded-2 border border-line bg-surface px-3 py-2.5 text-[15px] leading-5 text-ink outline-none transition-colors duration-hover placeholder:text-ink-3 focus:border-accent focus:outline-2 focus:outline-accent"
          />

          <Button
            type="submit"
            size="sm"
            aria-label="Send message"
            disabled={!text.trim() || left < 0 || send.isPending}
            className="h-11 w-11 shrink-0 px-0"
          >
            <Icon name="send" size={18} />
          </Button>
        </div>

        {left <= 100 && (
          <p
            aria-live="polite"
            className={cn(
              "mt-1 text-right text-[11px] tabular-nums",
              left < 0 ? "font-semibold text-danger" : "text-ink-3"
            )}
          >
            {left}
          </p>
        )}
      </form>
    </>
  );
}
