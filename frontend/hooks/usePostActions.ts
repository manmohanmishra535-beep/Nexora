"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import {
  patchPost,
  restoreCaches,
  snapshotCaches,
} from "@/lib/cache";
import type { Post, User } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

type LikeVars = { post: Post; liked: boolean };
type RepostVars = { post: Post; reposted: boolean };
type BookmarkVars = { post: Post; bookmarked: boolean };

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

/**
 * Every action updates the cache first, then rolls back and shows a toast if
 * the request fails. That is the behaviour the design system promises.
 */
export function usePostActions() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const likeMutation = useMutation({
    mutationFn: ({ post, liked }: LikeVars) =>
      liked
        ? api.post<{ liked: boolean; likeCount: number }>(
          `/posts/${post._id}/like`
        )
        : api.del<{ liked: boolean; likeCount: number }>(
          `/posts/${post._id}/like`
        ),

    onMutate: async ({ post, liked }) => {
      await queryClient.cancelQueries();
      const snapshot = snapshotCaches(queryClient);

      patchPost(queryClient, post._id, (current) => ({
        ...current,
        likedByMe: liked,
        likeCount: Math.max(
          0,
          current.likeCount + (liked === current.likedByMe ? 0 : liked ? 1 : -1)
        ),
      }));

      return { snapshot };
    },

    onError: (error, _vars, context) => {
      if (context) {
        restoreCaches(queryClient, context.snapshot);
      }

      toast(
        errorMessage(error, "Couldn't update that like. Try again."),
        "error"
      );
    },

    onSuccess: (data, { post }) => {
      patchPost(queryClient, post._id, (current) => ({
        ...current,
        likedByMe: data.liked,
        likeCount: data.likeCount,
      }));
    },
  });

  const repostMutation = useMutation({
    mutationFn: async ({ post, reposted }: RepostVars): Promise<void> => {
      if (reposted) {
        await api.post<{ post: Post }>(`/posts/${post._id}/repost`);
        return;
      }

      await api.del<void>(`/posts/${post._id}/repost`);
    },

    onMutate: async ({ post, reposted }) => {
      await queryClient.cancelQueries();
      const snapshot = snapshotCaches(queryClient);

      patchPost(queryClient, post._id, (current) => ({
        ...current,
        repostedByMe: reposted,
        repostCount: Math.max(
          0,
          current.repostCount +
          (reposted === current.repostedByMe ? 0 : reposted ? 1 : -1)
        ),
      }));

      return { snapshot };
    },

    onError: (error, _vars, context) => {
      if (context) {
        restoreCaches(queryClient, context.snapshot);
      }

      toast(
        errorMessage(error, "Couldn't repost that. Try again."),
        "error"
      );
    },

    onSettled: (_data, _error, { post }) => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["post", post._id] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: ({ post, bookmarked }: BookmarkVars) =>
      bookmarked
        ? api.post<{ bookmarked: boolean }>(`/posts/${post._id}/bookmark`)
        : api.del<{ bookmarked: boolean }>(`/posts/${post._id}/bookmark`),

    onMutate: async ({ post, bookmarked }) => {
      const snapshot = snapshotCaches(queryClient);

      patchPost(queryClient, post._id, (current) => ({
        ...current,
        bookmarkedByMe: bookmarked,
      }));

      return { snapshot };
    },

    onError: (error, _vars, context) => {
      if (context) {
        restoreCaches(queryClient, context.snapshot);
      }

      toast(
        errorMessage(error, "Couldn't save that post. Try again."),
        "error"
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => api.del<void>(`/posts/${postId}`),

    onSuccess: (_data, postId) => {
      queryClient.removeQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast("Post deleted.");
    },

    onError: (error) => {
      toast(errorMessage(error, "Couldn't delete that post."), "error");
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      api.patch<{ post: Post }>(`/posts/${postId}`, { content }),

    onSuccess: ({ post }, { postId }) => {
      queryClient.setQueryData(["post", postId], post);
      patchPost(queryClient, postId, (current) => ({
        ...current,
        content: post.content,
        editedAt: post.editedAt,
      }));
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      toast("Post updated.");
    },

    onError: (error) => {
      toast(errorMessage(error, "Couldn't update that post."), "error");
    },
  });

  return {
    like: (post: Post) => likeMutation.mutate({ post, liked: !post.likedByMe }),
    repost: (post: Post) =>
      repostMutation.mutate({ post, reposted: !post.repostedByMe }),
    bookmark: (post: Post) =>
      bookmarkMutation.mutate({
        post,
        bookmarked: !post.bookmarkedByMe,
      }),
    remove: (postId: string) => deleteMutation.mutate(postId),
    edit: (postId: string, content: string) =>
      editMutation.mutateAsync({ postId, content }),
    isLiking: likeMutation.isPending,
    isEditing: editMutation.isPending,
  };
}

export function useFollow() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ user, follow }: { user: User; follow: boolean }) =>
      follow
        ? api.post<{ following: boolean }>(`/users/${user._id}/follow`)
        : api.del<{ following: boolean }>(`/users/${user._id}/follow`),

    onSuccess: (data, { user }) => {
      queryClient.setQueryData(["profile", user.username], (current: User | undefined) =>
        current
          ? {
            ...current,
            isFollowing: data.following,
            followersCount: Math.max(
              0,
              current.followersCount + (data.following ? 1 : -1)
            ),
          }
          : current
      );

      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },

    onError: (error) => {
      toast(errorMessage(error, "Couldn't update that follow."), "error");
    },
  });
}
