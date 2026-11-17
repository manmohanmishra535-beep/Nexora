
"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import { useAuth } from "@clerk/nextjs";
import CommentSection from "./CommentSection";

interface PostAuthor {
    name: string;
    username: string;
    avatar?: string;
}

interface Post {
    _id: string;
    content: string;
    imageUrl?: string;
    author: PostAuthor | null;
    createdAt: string;
    likedByMe: boolean;
    likesCount: number;
}

interface PostFeedProps {
    refreshKey: number;
}

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (!Number.isFinite(seconds) || seconds < 0) {
        return "just now";
    }

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== new Date().getFullYear()
            ? "numeric"
            : undefined,
    });
}

export default function PostFeed({ refreshKey }: PostFeedProps) {
    const { isLoaded, isSignedIn, getToken } = useAuth();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [pendingLikes, setPendingLikes] = useState<string[]>([]);
    const [likeErrors, setLikeErrors] = useState<Record<string, string>>({});

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const token = await getToken();

            if (!token) {
                throw new Error("Please sign in to view posts.");
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/posts`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: "no-store",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to load posts.");
            }

            setPosts(data.posts || []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        fetchPosts();
    }, [isLoaded, isSignedIn, fetchPosts, refreshKey]);

    const handleToggleLike = async (postId: string) => {
        if (pendingLikes.includes(postId)) return;

        try {
            setPendingLikes((previous) => [...previous, postId]);

            setLikeErrors((previous) => ({
                ...previous,
                [postId]: "",
            }));

            const token = await getToken();

            if (!token) {
                throw new Error("Please sign in to like posts.");
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/posts/${postId}/like`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to update like.");
            }

            setPosts((previousPosts) =>
                previousPosts.map((post) =>
                    post._id === postId
                        ? {
                            ...post,
                            likedByMe: data.liked,
                            likesCount: data.likesCount,
                        }
                        : post
                )
            );
        } catch (err) {
            setLikeErrors((previous) => ({
                ...previous,
                [postId]:
                    err instanceof Error
                        ? err.message
                        : "Unable to update like.",
            }));
        } finally {
            setPendingLikes((previous) =>
                previous.filter((id) => id !== postId)
            );
        }
    };

    if (!isLoaded || loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#dce5e1] border-t-[#07866d]" />
                <p className="mt-4 text-sm text-[#697873]">
                    Loading posts...
                </p>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="py-12 text-center text-sm text-[#697873]">
                Please sign in to view posts.
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                    onClick={fetchPosts}
                    className="mt-4 rounded-full bg-[#07866d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#06745e]"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e9f8f2] text-2xl text-[#07866d]">
                    ♙
                </div>

                <h2 className="mt-5 text-xl font-bold text-[#17211e]">
                    Your feed starts here
                </h2>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#697873]">
                    No posts yet. Be the first to share something
                    with your Nexora community.
                </p>
            </div>
        );
    }

    return (
        <section className="divide-y divide-[#e8eeeb]">
            {posts.map((post) => {
                const authorName =
                    post.author?.name || "Nexora User";

                const authorUsername =
                    post.author?.username || "user";

                const initials =
                    authorName.charAt(0).toUpperCase();

                const isPending =
                    pendingLikes.includes(post._id);

                return (
                    <article
                        key={post._id}
                        className="px-4 py-5 transition-colors hover:bg-[#fbfdfc] sm:px-6"
                    >
                        {/* Author */}
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#07866d] text-sm font-bold text-white">
                                {post.author?.avatar ? (
                                    <img
                                        src={post.author.avatar}
                                        alt={authorName}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    initials
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2">
                                    <span className="truncate text-[15px] font-bold text-[#17211e]">
                                        {authorName}
                                    </span>

                                    <span className="truncate text-sm text-[#7a8983]">
                                        @{authorUsername}
                                    </span>

                                    <span className="text-[#a0aaa5]">·</span>

                                    <time
                                        dateTime={post.createdAt}
                                        title={new Date(post.createdAt).toLocaleString()}
                                        className="text-sm text-[#7a8983]"
                                    >
                                        {formatTimeAgo(post.createdAt)}
                                    </time>
                                </div>
                            </div>

                            <button
                                type="button"
                                aria-label="More post options"
                                title="More options coming soon"
                                className="rounded-full px-2 py-1 text-xl text-[#82918a] hover:bg-[#edf4f0]"
                            >
                                ···
                            </button>
                        </div>

                        {/* Content */}
                        {post.content && (
                            <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-[#293832]">
                                {post.content}
                            </p>
                        )}

                        {/* Image */}
                        {post.imageUrl && (
                            <div className="mt-3 overflow-hidden rounded-2xl border border-[#e2e9e5] bg-[#f4f7f6]">
                                <img
                                    src={post.imageUrl}
                                    alt="Post attachment"
                                    className="max-h-[550px] w-full object-contain"
                                    loading="lazy"
                                />
                            </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 flex max-w-md items-center justify-between">
                            <button
                                type="button"
                                onClick={() => handleToggleLike(post._id)}
                                disabled={isPending}
                                aria-label={
                                    post.likedByMe ? "Unlike post" : "Like post"
                                }
                                aria-pressed={post.likedByMe}
                                className={`group flex items-center gap-2 rounded-full px-2 py-1.5 transition ${post.likedByMe
                                        ? "text-rose-600"
                                        : "text-[#82918a] hover:bg-rose-50 hover:text-rose-600"
                                    } disabled:opacity-50`}
                            >
                                <span className="text-xl transition-transform group-hover:scale-110">
                                    {post.likedByMe ? "♥" : "♡"}
                                </span>
                                <span className="text-sm">
                                    {post.likesCount || 0}
                                </span>
                            </button>

                            <span className="flex items-center gap-2 text-[#82918a]">
                                <span className="text-xl">○</span>
                                <span className="text-sm">Comments</span>
                            </span>

                            <button
                                type="button"
                                title="Share functionality coming soon"
                                className="flex items-center gap-2 rounded-full px-2 py-1.5 text-[#82918a] transition hover:bg-[#edf4f0] hover:text-[#07866d]"
                            >
                                <span className="text-xl">↗</span>
                                <span className="text-sm">Share</span>
                            </button>
                        </div>

                        {/* Like Error */}
                        {likeErrors[post._id] && (
                            <p role="alert" className="mt-2 text-xs text-red-600">
                                {likeErrors[post._id]}
                            </p>
                        )}

                        {/* Comments */}
                        <div className="mt-3">
                            <CommentSection postId={post._id} />
                        </div>
                    </article>
                );
            })}
        </section>
    );
}
