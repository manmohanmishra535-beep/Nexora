"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import InfiniteSentinel from "@/components/ui/InfiniteSentinel";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useApi } from "@/hooks/useApi";
import { useComments } from "@/hooks/useNexora";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatTimeAgo } from "@/lib/format";
import type { Comment } from "@/lib/types";

function CommentRow({
  comment,
  postId,
}: {
  comment: Comment;
  postId: string;
}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const remove = useMutation({
    mutationFn: () => api.del(`/comments/${comment._id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast("Reply deleted.");
    },
    onError: (error) => {
      toast(
        error instanceof ApiError ? error.message : "Couldn't delete that reply.",
        "error"
      );
    },
  });

  return (
    <article className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <Link
        href={`/${comment.author?.username || ""}`}
        aria-label="Author profile"
        className="rounded-full"
      >
        <Avatar
          src={comment.author?.profileImage?.url}
          name={comment.author?.displayName || "Nexora User"}
          size={32}
        />
      </Link>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link
            href={`/${comment.author?.username || ""}`}
            className="font-display text-[13px] font-bold hover:underline"
          >
            {comment.author?.displayName || "Nexora User"}
          </Link>

          <span className="text-[12px] text-ink-3">
            @{comment.author?.username || "user"}
          </span>

          <span aria-hidden="true" className="text-ink-3">
            ·
          </span>

          <span className="text-[12px] text-ink-3">
            {formatTimeAgo(comment.createdAt)}
          </span>

          {comment.author?.isMe && (
            <button
              type="button"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              aria-label="Delete reply"
              className="ml-auto grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-danger disabled:opacity-45"
            >
              <Icon name="trash" size={15} />
            </button>
          )}
        </div>

        <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] leading-6 text-ink">
          {comment.content}
        </p>
      </div>
    </article>
  );
}

export default function CommentSection({ postId }: { postId: string }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();

  const comments = useComments(postId);
  const { isSignedIn } = useUser();
  const [text, setText] = useState("");

  const left = 280 - text.length;
  const over = left < 0;

  const create = useMutation({
    mutationFn: () =>
      api.post(`/posts/${postId}/comments`, { content: text.trim() }),

    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast("Reply posted");
    },

    onError: (error) => {
      toast(
        error instanceof ApiError ? error.message : "Couldn't post that reply.",
        "error"
      );
    },
  });

  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];
  const name = user?.fullName || user?.firstName || "Nexora User";

  return (
    <section aria-label="Replies" className="border-t border-line">
      {!isSignedIn ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
          <p className="text-[13px] text-ink-2">
            Sign in to join the conversation.
          </p>

          <Link
            href="/sign-in"
            className="flex h-8 items-center rounded-pill bg-accent px-3.5 text-[13px] font-semibold text-on-accent"
          >
            Sign in
          </Link>
        </div>
      ) : (
      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (!text.trim() || over || create.isPending) {
            return;
          }

          create.mutate();
        }}
        className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 border-b border-line px-4 py-4 sm:px-5"
      >
        <Avatar src={user?.imageUrl} name={name} size={44} />

        <div>
          <label htmlFor="reply" className="sr-only">
            Write a reply
          </label>

          <textarea
            id="reply"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Post your reply"
            rows={2}
            className="min-h-[56px] w-full resize-y bg-transparent py-1 text-[18px] leading-[1.4] text-ink outline-none placeholder:text-ink-3"
          />

          <div className="mt-2 flex items-center justify-end gap-3 border-t border-line pt-3">
            <span
              aria-live="polite"
              className={cn(
                "text-[13px] tabular-nums",
                over
                  ? "font-semibold text-danger"
                  : left <= 20
                    ? "text-warn"
                    : "text-ink-3"
              )}
            >
              {left}
            </span>

            <Button
              type="submit"
              size="sm"
              disabled={!text.trim() || over || create.isPending}
            >
              {create.isPending ? "Replying" : "Reply"}
            </Button>
          </div>
        </div>
      </form>
      )}

      {comments.isLoading ? (
        <Spinner label="Loading replies" />
      ) : items.length === 0 ? (
        <p className="px-5 py-10 text-center text-[13px] text-ink-3">
          No replies yet. Start the conversation.
        </p>
      ) : (
        <>
          {items.map((comment) => (
            <CommentRow
              key={comment._id}
              comment={comment}
              postId={postId}
            />
          ))}

          <InfiniteSentinel
            hasMore={Boolean(comments.hasNextPage)}
            loading={comments.isFetchingNextPage}
            onVisible={() => comments.fetchNextPage()}
            endLabel=""
          />
        </>
      )}
    </section>
  );
}
