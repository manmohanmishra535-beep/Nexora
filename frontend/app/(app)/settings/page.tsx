"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useTheme } from "@/components/ThemeProvider";
import { useApi } from "@/hooks/useApi";
import { useMyProfile } from "@/hooks/useNexora";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { User } from "@/lib/types";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export default function SettingsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mode, setMode } = useTheme();
  const { signOut } = useClerk();
  const me = useMyProfile();

  const [form, setForm] = useState({
    displayName: "",
    username: "",
    bio: "",
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (me.data) {
      setForm({
        displayName: me.data.displayName || "",
        username: me.data.username || "",
        bio: me.data.bio || "",
      });
    }
  }, [me.data]);

  useEffect(() => {
    if (!avatar) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(avatar);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  const save = useMutation({
    mutationFn: async () => {
      if (avatar) {
        const formData = new FormData();
        formData.append("displayName", form.displayName);
        formData.append("username", form.username);
        formData.append("bio", form.bio);
        formData.append("avatar", avatar);

        return api.upload<{ user: User }>("/users/me", formData, "PATCH");
      }

      return api.patch<{ user: User }>("/users/me", form);
    },

    onSuccess: (data) => {
      setFields({});
      setAvatar(null);
      queryClient.setQueryData(["me"], data.user);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast("Profile saved");
    },

    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.fields) {
          setFields(error.fields);
        }

        toast(error.message, "error");
        return;
      }

      toast("Couldn't save your profile.", "error");
    },
  });

  if (me.isLoading || !me.data) {
    return (
      <>
        <PageHeader title="Settings" />
        <Spinner label="Loading settings" />
      </>
    );
  }

  const avatarSrc = preview || me.data.profileImage?.url;

  return (
    <>
      <PageHeader title="Settings" subtitle="Profile, theme and session" />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
        className="divide-y divide-line"
      >
        <section className="px-4 py-5 sm:px-5" aria-labelledby="profile-settings">
          <h2
            id="profile-settings"
            className="font-display text-[18px] font-bold text-ink"
          >
            Profile
          </h2>

          <div className="mt-4 flex items-center gap-4">
            <Avatar src={avatarSrc} name={me.data.displayName} size={96} />

            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                <Icon name="image" size={16} />
                Change photo
              </Button>

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (!file) {
                    return;
                  }

                  if (file.size > 5 * 1024 * 1024) {
                    toast("Images must be smaller than 5 MB.", "error");
                    return;
                  }

                  setAvatar(file);
                }}
              />

              <p className="text-[12px] text-ink-3">
                JPEG, PNG, WebP or GIF · up to 5 MB
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-1.5">
              <label
                htmlFor="displayName"
                className="text-[13px] font-semibold text-ink-2"
              >
                Display name
              </label>

              <input
                id="displayName"
                value={form.displayName}
                maxLength={50}
                onChange={(event) =>
                  setForm({ ...form, displayName: event.target.value })
                }
                aria-invalid={Boolean(fields.displayName)}
                className={cn(
                  "h-11 rounded-1 border bg-surface px-3 text-[15px] text-ink outline-none transition-colors duration-hover focus:border-accent focus:outline-2 focus:outline-accent",
                  fields.displayName ? "border-danger" : "border-line"
                )}
              />

              {fields.displayName && (
                <p className="text-[13px] text-danger">{fields.displayName}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="username"
                className="text-[13px] font-semibold text-ink-2"
              >
                Username
              </label>

              <input
                id="username"
                value={form.username}
                maxLength={15}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
                aria-invalid={Boolean(fields.username)}
                aria-describedby="username-hint"
                className={cn(
                  "h-11 rounded-1 border bg-surface px-3 text-[15px] text-ink outline-none transition-colors duration-hover focus:border-accent focus:outline-2 focus:outline-accent",
                  fields.username ? "border-danger" : "border-line"
                )}
              />

              <p id="username-hint" className="text-[13px] text-ink-3">
                3–15 characters: letters, numbers and underscores.
              </p>

              {fields.username && (
                <p className="text-[13px] text-danger">{fields.username}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="bio"
                className="text-[13px] font-semibold text-ink-2"
              >
                Bio
              </label>

              <textarea
                id="bio"
                value={form.bio}
                maxLength={160}
                rows={4}
                onChange={(event) =>
                  setForm({ ...form, bio: event.target.value })
                }
                aria-invalid={Boolean(fields.bio)}
                className={cn(
                  "w-full resize-y rounded-1 border bg-surface px-3 py-2.5 text-[15px] text-ink outline-none transition-colors duration-hover focus:border-accent focus:outline-2 focus:outline-accent",
                  fields.bio ? "border-danger" : "border-line"
                )}
              />

              <p className="text-right text-[12px] tabular-nums text-ink-3">
                {form.bio.length}/160
              </p>

              {fields.bio && (
                <p className="text-[13px] text-danger">{fields.bio}</p>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving" : "Save changes"}
            </Button>

            <Link
              href={`/${me.data.username}`}
              className="text-[13px] font-semibold text-accent hover:underline"
            >
              View profile
            </Link>
          </div>
        </section>

        <section className="px-4 py-5 sm:px-5" aria-labelledby="theme-settings">
          <h2
            id="theme-settings"
            className="font-display text-[18px] font-bold text-ink"
          >
            Theme
          </h2>

          <p className="mt-1 text-[13px] text-ink-2">
            System follows your operating system. Light and dark override it
            and are remembered on this device.
          </p>

          <div
            role="group"
            aria-label="Theme"
            className="mt-3 flex flex-wrap gap-2"
          >
            {THEMES.map((theme) => (
              <button
                key={theme.value}
                type="button"
                aria-pressed={mode === theme.value}
                onClick={() => setMode(theme.value)}
                className={cn(
                  "h-8 rounded-pill border px-3.5 text-[13px] font-semibold transition-colors duration-hover",
                  mode === theme.value
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-ink-2 hover:bg-surface-2"
                )}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </section>

        <section className="px-4 py-5 sm:px-5" aria-labelledby="account-settings">
          <h2
            id="account-settings"
            className="font-display text-[18px] font-bold text-ink"
          >
            Account
          </h2>

          <p className="mt-1 text-[13px] text-ink-2">
            Signed in as <b className="text-ink">{me.data.email}</b>. Password
            and email are managed by Clerk.
          </p>

          <Button
            variant="danger"
            size="sm"
            className="mt-4"
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
          >
            <Icon name="logout" size={16} />
            Log out
          </Button>
        </section>
      </form>
    </>
  );
}
