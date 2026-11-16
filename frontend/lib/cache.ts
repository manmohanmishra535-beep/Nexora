import type { QueryClient } from "@tanstack/react-query";

import type { Post } from "./types";

type PlainObject = Record<string, unknown>;

const isPost = (value: PlainObject) =>
  typeof value.likeCount === "number" &&
  typeof value._id === "string" &&
  "likedByMe" in value;

/**
 * Walks every cached value (feed pages, single posts, nested reposts) and
 * applies an optimistic update to the post with this id.
 */
function walk(
  value: unknown,
  postId: string,
  updater: (post: Post) => Post
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => walk(entry, postId, updater));
  }

  if (!value || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  const record = value as PlainObject;
  const next: PlainObject = { ...record };

  if (isPost(record) && String(record._id) === postId) {
    return updater(record as unknown as Post);
  }

  for (const [key, entry] of Object.entries(record)) {
    if (entry && typeof entry === "object") {
      next[key] = walk(entry, postId, updater);
    }
  }

  return next;
}

export function patchPost(
  queryClient: QueryClient,
  postId: string,
  updater: (post: Post) => Post
) {
  queryClient.setQueriesData({}, (data) => walk(data, postId, updater));
}

export function snapshotCaches(queryClient: QueryClient) {
  return queryClient.getQueriesData({});
}

export function restoreCaches(
  queryClient: QueryClient,
  snapshot: ReturnType<typeof snapshotCaches>
) {
  snapshot.forEach(([key, data]) => {
    queryClient.setQueryData(key, data);
  });
}
