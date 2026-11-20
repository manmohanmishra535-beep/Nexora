"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";

import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useApi } from "@/hooks/useApi";
import { useConversations, useMessages } from "@/hooks/useNexora";
import { cn } from "@/lib/cn";
import { formatTimeAgo } from "@/lib/format";
import type { Conversation, Message } from "@/lib/types";

function ChatThread({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");

  const otherUser =
    conversation.participants.find((p) => p.username !== user?.username) ||
    conversation.participants[0];

  const messagesQuery = useMessages(conversation._id);
  const messages =
    messagesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const sendMutation = useMutation({
    mutationFn: (text: string) =>
      api.post<{ message: Message }>(
        `/conversations/${conversation._id}/messages`,
        { text }
      ),
    onSuccess: (data) => {
      setDraft("");
      queryClient.invalidateQueries({
        queryKey: ["messages", conversation._id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => {
      toast("Couldn't send message. Please try again.", "error");
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sendMutation.isPending) return;
    sendMutation.mutate(draft.trim());
  };

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col min-[720px]:h-screen">
      {/* Thread header */}
      <header className="flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
        >
          <Icon name="back" size={20} />
        </button>

        <Avatar
          src={otherUser?.profileImage?.url}
          name={otherUser?.displayName}
          size={32}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-bold text-ink">
            {otherUser?.displayName || otherUser?.username}
          </p>
          <p className="truncate text-[12px] text-ink-3">@{otherUser?.username}</p>
        </div>
      </header>

      {/* Messages body */}
      <div className="flex flex-1 flex-col-reverse overflow-y-auto p-4 space-y-3 space-y-reverse">
        {messagesQuery.isLoading ? (
          <Spinner label="Loading messages…" />
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-ink-3">
            No messages yet. Send a greeting to start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isMe =
              message.sender?.username === user?.username ||
              message.sender?.isMe;

            return (
              <div
                key={message._id}
                className={cn(
                  "flex flex-col max-w-[75%]",
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2 px-4 py-2.5 text-[14px] leading-5",
                    isMe
                      ? "bg-accent text-on-accent rounded-br-none"
                      : "bg-surface-2 text-ink rounded-bl-none"
                  )}
                >
                  {message.text}
                </div>
                <span className="mt-1 text-[11px] text-ink-3">
                  {formatTimeAgo(message.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Message input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-line bg-surface p-3"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Start a new message…"
          className="h-10 flex-1 rounded-pill bg-surface-2 px-4 text-[14px] text-ink outline-none placeholder:text-ink-3"
        />

        <Button
          type="submit"
          size="sm"
          disabled={!draft.trim() || sendMutation.isPending}
        >
          <Icon name="send" size={16} />
        </Button>
      </form>
    </div>
  );
}

export default function MessagesPage() {
  const conversationsQuery = useConversations();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const conversations = conversationsQuery.data || [];

  if (selectedConversation) {
    return (
      <AppShell>
        <ChatThread
          conversation={selectedConversation}
          onBack={() => setSelectedConversation(null)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-5">
        <h1 className="font-display text-[19px] font-bold text-ink">Messages</h1>
      </header>

      {/* Conversation list */}
      {conversationsQuery.isLoading ? (
        <Spinner label="Loading conversations…" />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon="mail"
          title="Welcome to your inbox"
          body="Drop a line, share posts, and talk privately with people on Nexora."
        />
      ) : (
        <section aria-label="Conversation list" className="divide-y divide-line">
          {conversations.map((conv) => {
            const other = conv.participants[0];

            return (
              <button
                key={conv._id}
                type="button"
                onClick={() => setSelectedConversation(conv)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/50 sm:px-5"
              >
                <Avatar
                  src={other?.profileImage?.url}
                  name={other?.displayName}
                  size={44}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-display text-[15px] font-bold text-ink">
                      {other?.displayName || other?.username}
                    </span>
                    {conv.lastMessage && (
                      <span className="shrink-0 text-[12px] text-ink-3">
                        {formatTimeAgo(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>

                  <p className="truncate text-[13px] text-ink-3">
                    {conv.lastMessage?.text || "Started a conversation"}
                  </p>
                </div>
              </button>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
