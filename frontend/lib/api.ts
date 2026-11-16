import type { ApiErrorBody } from "./types";

const RAW_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const API_BASE = `${RAW_BASE.replace(/\/+$/, "")}/api`;

export const SOCKET_URL = (
  process.env.NEXT_PUBLIC_SOCKET_URL || RAW_BASE
).replace(/\/+$/, "");

type Query = Record<string, string | number | null | undefined>;

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string | null;
  query?: Query;
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(`${API_BASE}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    token,
    query,
    body,
    formData,
    signal,
  } = options;

  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      credentials: "include",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      0,
      "NETWORK",
      "Cannot reach the Nexora API. Is the backend running?"
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorBody = (payload || {}) as ApiErrorBody;
    const status = response.status;

    if (status === 401) {
      throw new ApiError(
        401,
        "UNAUTHENTICATED",
        errorBody.error?.message || "Your session expired. Log in again."
      );
    }

    throw new ApiError(
      status,
      errorBody.error?.code || "INTERNAL",
      errorBody.error?.message || "Something went wrong. Try again.",
      errorBody.error?.fields
    );
  }

  return payload as T;
}
