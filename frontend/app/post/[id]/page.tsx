"use client";

import { useParams, useRouter } from "next/navigation";

import AppShell from "@/components/AppShell";
import CommentSection from "@/components/CommentSection";
import EmptyState from "@/components/EmptyState";
import PostCard from "@/components/PostCard";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import { usePost } from "@/hooks/useNexora";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = params?.id || "";

  const postQuery = usePost(postId);
  const post = postQuery.data;

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-5">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-surface-2"
        >
          <Icon name="back" size={20} />
        </button>

        <h1 className="font-display text-[19px] font-bold text-ink">Post</h1>
      </header>

      {/* Content */}
      {postQuery.isLoading ? (
        <Spinner label="Loading post…" />
      ) : postQuery.isError || !post ? (
        <EmptyState
          icon="spark"
          title="Post not found"
          body="This post may have been deleted, or the link you followed might be incorrect."
          action={
            <Button size="sm" onClick={() => router.push("/")}>
              Back to Home
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-line">
          <PostCard post={post} detail />
          <CommentSection postId={postId} />
        </div>
      )}
    </AppShell>
  );
}
