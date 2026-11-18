"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";

import { apiRequest } from "@/lib/api";

type Query = Record<string, string | number | null | undefined>;

export type Api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => Promise<T>;
  post: <T>(path: string, body?: unknown) => Promise<T>;
  patch: <T>(path: string, body?: unknown) => Promise<T>;
  del: <T>(path: string, body?: unknown) => Promise<T>;
  upload: <T>(
    path: string,
    formData: FormData,
    method?: "POST" | "PATCH"
  ) => Promise<T>;
};

/**
 * One wrapper around apiRequest that attaches the Clerk session token.
 * Components never call fetch directly.
 */
export function useApi(): Api {
  const { getToken } = useAuth();

  return useMemo(() => {
    const token = () => getToken();

    return {
      get: async <T,>(
        path: string,
        query?: Query,
        signal?: AbortSignal
      ) =>
        apiRequest<T>(path, {
          method: "GET",
          token: await token(),
          query,
          signal,
        }),

      post: async <T,>(path: string, body?: unknown) =>
        apiRequest<T>(path, {
          method: "POST",
          token: await token(),
          body,
        }),

      patch: async <T,>(path: string, body?: unknown) =>
        apiRequest<T>(path, {
          method: "PATCH",
          token: await token(),
          body,
        }),

      del: async <T,>(path: string, body?: unknown) =>
        apiRequest<T>(path, {
          method: "DELETE",
          token: await token(),
          body,
        }),

      upload: async <T,>(
        path: string,
        formData: FormData,
        method: "POST" | "PATCH" = "POST"
      ) =>
        apiRequest<T>(path, {
          method,
          token: await token(),
          formData,
        }),
    };
  }, [getToken]);
}
