"use client";

import {
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";

import { useApi } from "@/hooks/useApi";
import type {
  Comment,
  Conversation,
  Message,
  Notification,
  Page,
  Post,
  User,
} from "@/lib/types";

const PAGE_SIZE = 20;

export type FeedTab = "for-you" | "following";

export function useFeed(tab: FeedTab) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: ["feed", tab],
    queryFn: ({ pageParam }) =>
      api.get<Page<Post>>(
        tab === "following" ? "/posts/feed" : "/posts/explore",
        { limit: PAGE_SIZE, cursor: pageParam }
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useProfile(username: string) {
  const api = useApi();

  return useQuery({
    queryKey: ["profile", username],
    queryFn: () => api.get<{ user: User }>(`/users/${username}`).then((r) => r.user),
    enabled: Boolean(username),
  });
}

export function useMyProfile(enabled = true) {
  const api = useApi();

  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<{ user: User }>("/users/me").then((r) => r.user),
    enabled,
  });
}

export function useUserPosts(username: string) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: ["user-posts", username],
    queryFn: ({ pageParam }) =>
      api.get<Page<Post>>(`/posts/user/${username}`, {
        limit: PAGE_SIZE,
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(username),
  });
}

export function useUserReplies(username: string) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: ["user-replies", username],
    queryFn: ({ pageParam }) =>
      api.get<Page<Comment>>(`/users/${username}/replies`, {
        limit: PAGE_SIZE,
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(username),
  });
}

export function useLikedPosts(username: string) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: ["user-likes", username],
    queryFn: ({ pageParam }) =>
      api.get<Page<Post>>(`/users/${username}/likes`, {
        limit: PAGE_SIZE,
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(username),
  });
}

export function usePost(postId: string) {
  const api = useApi();

  return useQuery({
    queryKey: ["post", postId],
    queryFn: () => api.get<{ post: Post }>(`/posts/${postId}`).then((r) => r.post),
    enabled: Boolean(postId),
  });
}

export function useComments(postId: string) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: ["comments", postId],
    queryFn: ({ pageParam }) =>
      api.get<Page<Comment>>(`/posts/${postId}/comments`, {
        limit: 20,
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(postId),
  });
}

export function useNotifications() {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) =>
      api.get<Page<Notification>>("/notifications", {
        limit: 20,
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useUnreadCount(enabled = true) {
  const api = useApi();

  return useQuery({
    queryKey: ["unread-count"],
    queryFn: () =>
      api.get<{ count: number }>("/notifications/unread-count").then((r) => r.count),
    staleTime: 0,
    enabled,
  });
}

export function useConversations() {
  const api = useApi();

  return useQuery({
    queryKey: ["conversations"],
    queryFn: () =>
      api.get<{ items: Conversation[] }>("/conversations").then((r) => r.items),
  });
}

export function useMessages(conversationId: string) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam }) =>
      api.get<Page<Message>>(`/conversations/${conversationId}/messages`, {
        limit: 30,
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(conversationId),
  });
}

export function useSearchUsers(query: string) {
  const api = useApi();
  const term = query.trim();

  return useQuery<User[]>({
    queryKey: ["search", term],
    queryFn: () =>
      api
        .get<{ items: User[] }>("/users/search", { q: term })
        .then((r) => r.items),
    enabled: term.length > 0,
    staleTime: 10_000,
  });
}

export function useSuggestions(enabled = true) {
  const api = useApi();

  return useQuery({
    queryKey: ["suggestions"],
    queryFn: () =>
      api.get<{ items: User[] }>("/users/suggestions").then((r) => r.items),
    enabled,
  });
}

export function useBookmarks() {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: ["bookmarks"],
    queryFn: ({ pageParam }) =>
      api.get<Page<Post>>("/posts/bookmarks", {
        limit: PAGE_SIZE,
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useRelation(
  username: string,
  field: "followers" | "following"
) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: ["relations", username, field],
    queryFn: ({ pageParam }) =>
      api.get<Page<User>>(`/users/${username}/${field}`, {
        limit: 20,
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(username),
  });
}
