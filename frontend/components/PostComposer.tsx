
"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import type { FormEvent, ChangeEvent } from "react";

interface PostComposerProps {
    onPostCreated?: () => void;
}

export default function PostComposer({
    onPostCreated,
}: PostComposerProps) {
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();

    const [content, setContent] = useState("");
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const initials =
        `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`
            .toUpperCase() || "N";

    useEffect(() => {
        if (!selectedImage) {
            setPreviewUrl("");
            return;
        }

        const url = URL.createObjectURL(selectedImage);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [selectedImage]);

    const handleImageChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        ];

        if (!allowedTypes.includes(file.type)) {
            setMessage("Please select a JPG, PNG, WEBP or GIF image.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMessage("Image must be smaller than 5 MB.");
            event.target.value = "";
            return;
        }

        setSelectedImage(file);
        setMessage("");
    };

    const removeImage = () => {
        setSelectedImage(null);
        setMessage("");

        const input = document.getElementById(
            "post-image"
        ) as HTMLInputElement | null;

        if (input) input.value = "";
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (!content.trim() && !selectedImage) {
            setMessage("Write something or select an image.");
            return;
        }

        try {
            setLoading(true);
            setMessage("");

            const token = await getToken();

            if (!token) {
                throw new Error("Please sign in before creating a post.");
            }

            const formData = new FormData();
            formData.append("content", content.trim());

            if (selectedImage) {
                formData.append("image", selectedImage);
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/posts`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Could not create post."
                );
            }

            setContent("");
            setSelectedImage(null);

            const input = document.getElementById(
                "post-image"
            ) as HTMLInputElement | null;

            if (input) input.value = "";

            setMessage("Post created successfully!");
            onPostCreated?.();

        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
    };

    if (!isLoaded) {
        return <p className="text-sm text-slate-500">Loading...</p>;
    }

    if (!isSignedIn) {
        return (
            <p className="text-sm text-slate-500">
                Please sign in to create a post.
            </p>
        );
    }

    return (
        <div className="w-full bg-white">
            <form onSubmit={handleSubmit}>

                {/* Main Composer */}
                <div className="flex items-start gap-4">

                    {/* User Avatar */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ed7900] text-xl font-semibold text-white">
                        {user?.imageUrl ? (
                            <img
                                src={user.imageUrl}
                                alt="Your profile"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            initials
                        )}
                    </div>

                    {/* Text Input */}
                    <div className="min-w-0 flex-1">
                        <textarea
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder="What is happening on your street today?"
                            maxLength={2000}
                            rows={2}
                            className="min-h-[76px] w-full resize-none bg-transparent py-1 text-lg leading-7 text-[#293832] outline-none placeholder:text-[#84938d]"
                        />

                        {/* Image Preview */}
                        {previewUrl && (
                            <div className="relative mt-3 overflow-hidden rounded-2xl border border-[#dce5e1] bg-[#f4f7f6]">
                                <img
                                    src={previewUrl}
                                    alt="Selected image preview"
                                    className="max-h-[350px] w-full object-contain"
                                />

                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute right-3 top-3 rounded-full bg-black/75 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                                >
                                    ✕ Remove
                                </button>
                            </div>
                        )}

                        {/* Composer Footer */}
                        <div className="mt-3 flex items-center justify-between border-t border-[#dce5e1] pt-4">

                            {/* Photo Upload */}
                            <div className="flex items-center gap-2">
                                <label
                                    htmlFor="post-image"
                                    className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#07866d] transition hover:bg-[#e9f8f2]"
                                >
                                    <svg
                                        width="21"
                                        height="21"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <path d="m21 15-5-5L5 21" />
                                    </svg>
                                    Photo
                                </label>

                                <input
                                    id="post-image"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    disabled={loading}
                                />

                                <span className="hidden text-xs text-[#84938d] sm:inline">
                                    Maximum 5 MB
                                </span>
                            </div>

                            {/* Character Counter and Post */}
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-[#84938d]">
                                    {content.length}/2000
                                </span>

                                <button
                                    type="submit"
                                    disabled={
                                        loading ||
                                        (!content.trim() && !selectedImage)
                                    }
                                    className="rounded-full bg-[#07866d] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#06745e] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {loading ? "Posting..." : "Post"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* Status Message */}
            {message && (
                <p
                    role="status"
                    className={`mt-3 pl-16 text-sm ${message === "Post created successfully!"
                            ? "text-[#07866d]"
                            : "text-red-600"
                        }`}
                >
                    {message}
                </p>
            )}
        </div>
    );
}
