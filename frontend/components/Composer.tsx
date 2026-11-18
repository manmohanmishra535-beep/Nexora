"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { InlineSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useApi } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

const MAX = 280;
const CIRCUMFERENCE = 69.115;
const MAX_IMAGES = 4;

type PickedImage = { file: File; url: string };

export default function Composer({
  variant = "feed",
}: {
  variant?: "feed" | "card";
}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();

  const [content, setContent] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const imagesRef = useRef<PickedImage[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(
    () => () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    },
    []
  );

  const left = MAX - content.length;
  const over = left < 0;
  const warning = left <= 20 && left >= 0;
  const empty = content.trim().length === 0 && images.length === 0;
  const offset =
    CIRCUMFERENCE * (1 - Math.min(content.length, MAX) / MAX);

  const name = user?.fullName || user?.firstName || "Nexora User";

  const addFiles = (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }

    setError("");

    const accepted: PickedImage[] = [];
    const room = MAX_IMAGES - images.length;

    if (room <= 0) {
      setError("A post can have at most 4 images.");
      return;
    }

    for (const file of Array.from(fileList).slice(0, room)) {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        setError("Use a JPEG, PNG, WebP or GIF image.");
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Images must be smaller than 5 MB.");
        continue;
      }

      accepted.push({ file, url: URL.createObjectURL(file) });
    }

    setImages((current) => [...current, ...accepted]);
  };

  const removeImage = (index: number) => {
    setImages((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, position) => position !== index);
    });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const reset = () => {
    images.forEach((image) => URL.revokeObjectURL(image.url));
    setImages([]);
    setContent("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const submit = async () => {
    if (empty || over || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("content", content.trim());
      images.forEach((image) => formData.append("images", image.file));

      await api.upload("/posts", formData);

      reset();
      toast("Posted");

      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    } catch (requestError) {
      const message =
        requestError instanceof ApiError
          ? requestError.message
          : "Could not create that post.";

      setError(message);
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)] gap-3",
        variant === "card"
          ? "rounded-2 border border-line bg-surface p-4"
          : "border-b border-line px-4 py-4 sm:px-5"
      )}
    >
      <Avatar src={user?.imageUrl} name={name} size={44} />

      <div className="min-w-0">
        <label htmlFor="composer" className="sr-only">
          Write a post
        </label>

        <textarea
          id="composer"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What's happening?"
          rows={2}
          className="min-h-[72px] w-full resize-y bg-transparent py-1 text-[18px] leading-[1.4] text-ink outline-none placeholder:text-ink-3"
        />

        {images.length > 0 && (
          <div
            className={cn(
              "mt-3 grid gap-1 overflow-hidden rounded-2 border border-line",
              images.length === 1 ? "grid-cols-1" : "grid-cols-2"
            )}
          >
            {images.map((image, index) => (
              <div
                key={image.url}
                className="relative bg-surface-2"
              >
                <Image
                  src={image.url}
                  alt={`Selected image ${index + 1}`}
                  width={800}
                  height={600}
                  unoptimized
                  className="max-h-[340px] w-full object-cover"
                />

                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  aria-label={`Remove image ${index + 1}`}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-bg transition-opacity duration-hover hover:opacity-90"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={submitting || images.length >= MAX_IMAGES}
              className="flex h-11 items-center gap-2 rounded-pill px-3 text-[13px] font-semibold text-accent transition-colors duration-hover hover:bg-accent-soft disabled:opacity-45"
            >
              <Icon name="image" size={20} />
              Photo
            </button>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(event) => addFiles(event.target.files)}
            />

            <span className="text-[12px] tabular-nums text-ink-3">
              {images.length}/{MAX_IMAGES}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center gap-2 text-[13px] tabular-nums text-ink-3",
                warning && "text-warn",
                over && "font-semibold text-danger"
              )}
            >
              <svg
                viewBox="0 0 28 28"
                width="28"
                height="28"
                aria-hidden="true"
                className="-rotate-90"
              >
                <circle
                  cx="14"
                  cy="14"
                  r="11"
                  fill="none"
                  strokeWidth="3"
                  className="stroke-line"
                />
                <circle
                  cx="14"
                  cy="14"
                  r="11"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={offset}
                  className={cn(
                    "transition-[stroke-dashoffset] duration-hover",
                    over
                      ? "stroke-danger"
                      : warning
                        ? "stroke-warn"
                        : "stroke-accent"
                  )}
                />
              </svg>

              <span aria-live="polite">{left}</span>
            </div>

            <Button
              type="submit"
              disabled={empty || over || submitting}
            >
              {submitting ? <InlineSpinner size={16} /> : null}
              {submitting ? "Posting" : "Post"}
            </Button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-[13px] text-danger">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
