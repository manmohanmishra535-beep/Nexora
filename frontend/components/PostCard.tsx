"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useRef, useState } from "react";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { usePostActions } from "@/hooks/usePostActions";
import { cn } from "@/lib/cn";
import { absoluteTime, formatCount, formatTimeAgo } from "@/lib/format";
import type { Post } from "@/lib/types";

function PostImages({
  images,
  href,
}: {
  images: Post["images"];
  href: string;
}) {
  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return (
      <Link
        href={href}
        className="mt-3 block overflow-hidden rounded-2 border border-line bg-surface-2"
      >
        <Image
          src={images[0].url}
          alt="Post image"
          width={1200}
          height={800}
          unoptimized
          className="max-h-[510px] w-full object-cover"
        />
      </Link>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-0.5 overflow-hidden rounded-2 border border-line bg-line">
      {images.slice(0, 4).map((image, index) => (
        <Link key={image.url} href={href} className="block bg-surface-2">
          <Image
            src={image.url}
            alt={`Post image ${index + 1}`}
            width={600}
            height={600}
            unoptimized
            className="aspect-square w-full object-cover"
          />
        </Link>
      ))}
    </div>
  );
}

export default function PostCard({
  post,
  detail = false,
}: {
  post: Post;
  detail?: boolean;
}) {
  const actions = usePostActions();
  const { toast } = useToast();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const menuRef = useRef<HTMLDetailsElement | null>(null);

  const requireAuth = () => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return false;
    }

    return true;
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const draftLeft = 280 - draft.length;

  const startEditing = () => {
    menuRef.current?.removeAttribute("open");
    setDraft(display.content);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!draft.trim() || draftLeft < 0) {
      return;
    }

    try {
      await actions.edit(display._id, draft.trim());
      setEditing(false);
    } catch {
      // The hook already showed a toast; keep the editor open to retry.
    }
  };

  // A repost is shown as the original post with a "Reposted by" line.
  const display = post.repostOf ?? post;
  const reposter = post.repostOf ? post.author : null;
  const author = display.author;
  const href = `/post/${display._id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${href}`
      );
      toast("Link copied");
    } catch {
      toast("Couldn't copy that link.", "error");
    }
  };

  const onDelete = () => {
    menuRef.current?.removeAttribute("open");

    if (!window.confirm("Delete this post? This cannot be undone.")) {
      return;
    }

    actions.remove(display._id);
  };

  return (
    <article
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)] gap-3 bg-surface px-4 py-4 transition-colors duration-hover hover:bg-surface-2/50 sm:px-5",
        !detail && "border-b border-line"
      )}
    >
      <Link
        href={author ? `/${author.username}` : "/"}
        className="h-11 w-11 rounded-full"
        aria-label={author ? `${author.displayName} profile` : "Profile"}
      >
        <Avatar
          src={author?.profileImage?.url}
          name={author?.displayName || "Nexora User"}
          size={44}
        />
      </Link>

      <div className="min-w-0">
        {reposter && (
          <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-ink-3">
            <Icon name="repost" size={14} />
            <Link
              href={`/${reposter.username}`}
              className="hover:underline"
            >
              Reposted by {reposter.displayName}
            </Link>
          </p>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <Link
              href={author ? `/${author.username}` : "/"}
              className="truncate font-display text-[15px] font-bold text-ink hover:underline"
            >
              {author?.displayName || "Nexora User"}
            </Link>

            <Link
              href={author ? `/${author.username}` : "/"}
              className="truncate text-[13px] text-ink-3 hover:underline"
            >
              @{author?.username || "user"}
            </Link>

            <span aria-hidden="true" className="text-ink-3">
              ·
            </span>

            <Link
              href={href}
              title={absoluteTime(display.createdAt)}
              className="text-[13px] text-ink-3 hover:underline"
            >
              {formatTimeAgo(display.createdAt)}
            </Link>

            {display.editedAt && (
              <span className="text-[12px] text-ink-3">· edited</span>
            )}
          </div>

          <details ref={menuRef} className="relative">
            <summary
              aria-label="Post options"
              className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-full text-ink-3 transition-colors duration-hover hover:bg-surface-2 hover:text-ink"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ···
              </span>
            </summary>

            <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-2 border border-line bg-surface p-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  menuRef.current?.removeAttribute("open");
                  copyLink();
                }}
                className="flex h-10 w-full items-center gap-2 rounded-1 px-3 text-left text-[13px] font-medium text-ink hover:bg-surface-2"
              >
                <Icon name="share" size={16} />
                Copy link
              </button>

              <Link
                href={href}
                onClick={() => menuRef.current?.removeAttribute("open")}
                className="flex h-10 w-full items-center gap-2 rounded-1 px-3 text-left text-[13px] font-medium text-ink hover:bg-surface-2"
              >
                <Icon name="reply" size={16} />
                Open thread
              </Link>

              {author?.isMe && display.content && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex h-10 w-full items-center gap-2 rounded-1 px-3 text-left text-[13px] font-medium text-ink hover:bg-surface-2"
                >
                  <Icon name="edit" size={16} />
                  Edit post
                </button>
              )}

              {author?.isMe && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex h-10 w-full items-center gap-2 rounded-1 px-3 text-left text-[13px] font-semibold text-danger hover:bg-surface-2"
                >
                  <Icon name="trash" size={16} />
                  Delete post
                </button>
              )}
            </div>
          </details>
        </div>

        {editing ? (
          <div className="mt-2">
            <label htmlFor={`edit-${display._id}`} className="sr-only">
              Edit post
            </label>

            <textarea
              id={`edit-${display._id}`}
              value={draft}
              rows={3}
              onChange={(event) => setDraft(event.target.value)}
              className="w-full resize-y rounded-1 border border-line bg-surface px-3 py-2.5 text-[15px] leading-[1.55] text-ink outline-none transition-colors duration-hover focus:border-accent focus:outline-2 focus:outline-accent"
            />

            <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2">
              <span
                aria-live="polite"
                className={cn(
                  "text-[13px] tabular-nums",
                  draftLeft < 0
                    ? "font-semibold text-danger"
                    : draftLeft <= 20
                      ? "text-warn"
                      : "text-ink-3"
                )}
              >
                {draftLeft}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditing(false)}
                  disabled={actions.isEditing}
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={
                    !draft.trim() ||
                    draftLeft < 0 ||
                    draft.trim() === display.content ||
                    actions.isEditing
                  }
                >
                  {actions.isEditing ? "Saving" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          display.content && (
            <Link href={href} className="mt-1 block">
              <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.55] text-ink">
                {display.content}
              </p>
            </Link>
          )
        )}

        <PostImages images={display.images} href={href} />

        <div className="-ml-2 mt-2 flex flex-wrap items-center gap-1">
          <Link
            href={href}
            aria-label={`Reply, ${formatCount(display.commentCount)} replies`}
            className="inline-flex h-11 min-w-11 items-center gap-1.5 rounded-pill px-2.5 text-[13px] tabular-nums text-ink-3 transition-colors duration-hover hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="reply" size={20} />
            <span>{formatCount(display.commentCount)}</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              if (requireAuth()) actions.repost(display);
            }}
            aria-pressed={display.repostedByMe}
            aria-label={`Repost, ${formatCount(display.repostCount)} reposts`}
            className={cn(
              "inline-flex h-11 min-w-11 items-center gap-1.5 rounded-pill px-2.5 text-[13px] tabular-nums transition-colors duration-hover hover:bg-surface-2",
              display.repostedByMe
                ? "font-semibold text-accent"
                : "text-ink-3 hover:text-accent"
            )}
          >
            <Icon name="repost" size={20} />
            <span>{formatCount(display.repostCount)}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (requireAuth()) actions.like(display);
            }}
            aria-pressed={display.likedByMe}
            aria-label={`Like, ${formatCount(display.likeCount)} likes`}
            className={cn(
              "inline-flex h-11 min-w-11 items-center gap-1.5 rounded-pill px-2.5 text-[13px] tabular-nums transition-colors duration-hover hover:bg-surface-2",
              display.likedByMe
                ? "text-like"
                : "text-ink-3 hover:text-like"
            )}
          >
            <Icon
              name="heart"
              size={20}
              filled={display.likedByMe}
              className={display.likedByMe ? "like-pop" : undefined}
            />
            <span>{formatCount(display.likeCount)}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (requireAuth()) actions.bookmark(display);
            }}
            aria-pressed={display.bookmarkedByMe}
            aria-label={
              display.bookmarkedByMe ? "Remove bookmark" : "Bookmark post"
            }
            className={cn(
              "inline-flex h-11 min-w-11 items-center gap-1.5 rounded-pill px-2.5 text-[13px] transition-colors duration-hover hover:bg-surface-2",
              display.bookmarkedByMe
                ? "text-accent"
                : "text-ink-3 hover:text-accent"
            )}
          >
            <Icon
              name="bookmark"
              size={20}
              filled={display.bookmarkedByMe}
            />
          </button>

          <button
            type="button"
            onClick={copyLink}
            aria-label="Share post"
            className="inline-flex h-11 min-w-11 items-center gap-1.5 rounded-pill px-2.5 text-[13px] text-ink-3 transition-colors duration-hover hover:bg-surface-2 hover:text-accent"
          >
            <Icon name="share" size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}
