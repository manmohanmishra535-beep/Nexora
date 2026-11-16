"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { InlineSpinner } from "@/components/ui/Spinner";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useApi } from "@/hooks/useApi";
import {
  useConversations,
  useMyProfile,
  useSearchUsers,
} from "@/hooks/useNexora";
import { ApiError } from "@/lib/api";
import { formatTimeAgo } from "@/lib/format";
import type { Author, Conversation } from "@/lib/types";

function otherParticipant(
  conversation: Conversation,
  myId?: string
): Author | undefined {
  return (
    conversation.participants.find((person) => person._id !== myId) ||
    conversation.participants[0]
  );
}

export default function MessagesPage() {
  const api = useApi();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const conversations = useConversations();
  const me = useMyProfile();

  const [composing, setComposing] = useState(false);
  const [term, setTerm] = useState("");

  const results = useSearchUsers(term);
  const people = results.data ?? [];

  const start = useMutation({
    mutationFn: (userId: string) =>
      api.post<{ conversation: Conversation }>("/conversations", { userId }),

    onSuccess: ({ conversation }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/messages/${conversation._id}`);
    },

    onError: (error) => {
      toast(
        error instanceof ApiError
          ? error.message
          : "Couldn't start that conversation.",
        "error"
      );
    },
  });

  const items = conversations.data ?? [];

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Private conversations"
        action={
          <Button
            variant={composing ? "ghost" : "secondary"}
            size="sm"
            aria-expanded={composing}
            onClick={() => {
              setComposing(!composing);
              setTerm("");
            }}
          >
            <Icon name="plus" size={16} />
            {composing ? "Close" : "New"}
          </Button>
        }
      />

      {composing && (
        <section
          aria-label="Start a conversation"
          className="border-b border-line px-4 py-4 sm:px-5"
        >
          <div className="flex h-11 items-center gap-2.5 rounded-pill bg-surface-2 px-4">
            <Icon name="search" size={18} className="text-ink-3" />

            <label htmlFor="message-search" className="sr-only">
              Search people to message
            </label>

            <input
              id="message-search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search people to message"
              autoComplete="off"
              autoFocus
              className="h-full w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
            />
          </div>

          {term.trim() === "" ? (
            <p className="mt-3 text-[13px] text-ink-3">
              Type a name or @username to find someone.
            </p>
          ) : results.isLoading ? (
            <div className="py-2">
              <InlineSpinner />
            </div>
          ) : people.length === 0 ? (
            <p className="mt-3 text-[13px] text-ink-3">
              Nobody matches “{term.trim()}”.
            </p>
          ) : (
            <div className="mt-2 divide-y divide-line">
              {people.map((person) => (
                <button
                  key={person._id}
                  type="button"
                  disabled={start.isPending || person.isMe}
                  onClick={() => start.mutate(person._id)}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition-colors duration-hover hover:bg-surface-2/60 disabled:opacity-50"
                >
                  <Avatar
                    src={person.profileImage?.url}
                    name={person.displayName}
                    size={32}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">
                      {person.displayName}
                    </span>
                    <span className="block truncate text-[12px] text-ink-3">
                      @{person.username}
                    </span>
                  </span>

                  {person.isMe ? (
                    <span className="text-[12px] text-ink-3">You</span>
                  ) : (
                    <Icon name="mail" size={18} className="text-ink-3" />
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {conversations.isLoading ? (
        <Spinner label="Loading conversations" />
      ) : conversations.isError ? (
        <EmptyState
          icon="mail"
          title="Messages didn't load"
          body="The conversation request failed. Check that the API is running, then try again."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="mail"
          title="No messages yet"
          body="Open someone's profile and press Message, or start a conversation from the New button above."
          action={
            <Link
              href="/explore"
              className="flex h-8 items-center rounded-pill bg-accent px-3.5 text-[13px] font-semibold text-on-accent"
            >
              Find people
            </Link>
          }
        />
      ) : (
        <section aria-label="Conversations" className="divide-y divide-line">
          {items.map((conversation) => {
            const person = otherParticipant(conversation, me.data?._id);
            const last = conversation.lastMessage;

            return (
              <Link
                key={conversation._id}
                href={`/messages/${conversation._id}`}
                className="flex gap-3 px-4 py-4 transition-colors duration-hover hover:bg-surface-2/60 sm:px-5"
              >
                <Avatar
                  src={person?.profileImage?.url}
                  name={person?.displayName || "Nexora User"}
                  size={44}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="min-w-0 flex-1 truncate font-display text-[15px] font-bold text-ink">
                      {person?.displayName || "Nexora User"}
                    </p>

                    <span className="shrink-0 text-[12px] text-ink-3">
                      {formatTimeAgo(last?.createdAt || conversation.updatedAt)}
                    </span>
                  </div>

                  <p className="truncate text-[12px] text-ink-3">
                    @{person?.username || "user"}
                  </p>

                  <p className="mt-0.5 truncate text-[13px] text-ink-2">
                    {last
                      ? `${
                          last.sender === me.data?._id ? "You: " : ""
                        }${last.text}`
                      : "Say hello to start the conversation."}
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </>
  );
}
