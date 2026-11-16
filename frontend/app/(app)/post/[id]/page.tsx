"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import CommentSection from "@/components/CommentSection";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import PostCard from "@/components/PostCard";
import Spinner from "@/components/ui/Spinner";
import { usePost } from "@/hooks/useNexora";
import { formatCount } from "@/lib/format";

export default function PostPage() {
  const params = useParams();
  const postId = String(params.id ?? "");
  const post = usePost(postId);

  if (post.isLoading) {
    return (
      <>
        <PageHeader title="Post" back />
        <Spinner label="Loading post" />
      </>
    );
  }

  if (post.isError || !post.data) {
    return (
      <>
        <PageHeader title="Post" back />

        <EmptyState
          icon="spark"
          title="This post isn't available"
          body="It may have been deleted, or the link is wrong. Head back to the feed to keep exploring."
          action={
            <Link
              href="/"
              className="flex h-8 items-center rounded-pill bg-accent px-3.5 text-[13px] font-semibold text-on-accent"
            >
              Back to home
            </Link>
          }
        />
      </>
    );
  }

  // Reposts point at the original, and the conversation lives there.
  const display = post.data.repostOf ?? post.data;

  return (
    <>
      <PageHeader
        title="Post"
        subtitle={`${formatCount(display.commentCount)} ${
          display.commentCount === 1 ? "reply" : "replies"
        }`}
        back
      />

      <PostCard post={post.data} detail />

      <CommentSection postId={display._id} />
    </>
  );
}
