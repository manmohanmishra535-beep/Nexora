"use client";

import { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";

import AppShell from "@/components/AppShell";
import LogoutDialog from "@/components/LogoutDialog";
import { useTheme } from "@/components/ThemeProvider";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatJoined } from "@/lib/format";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { mode, setMode } = useTheme();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const themeOptions: Array<{ mode: "system" | "light" | "dark"; label: string }> = [
    { mode: "system", label: "System default" },
    { mode: "light", label: "Light theme" },
    { mode: "dark", label: "Dark theme" },
  ];

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-5">
        <h1 className="font-display text-[19px] font-bold text-ink">Settings</h1>
      </header>

      <div className="divide-y divide-line">
        {/* Appearance Section */}
        <section className="p-4 sm:p-6">
          <h2 className="font-display text-[16px] font-bold text-ink">
            Appearance
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">
            Choose how Nexora looks to you. Select a single theme or sync with your system.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {themeOptions.map((opt) => {
              const active = mode === opt.mode;

              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => setMode(opt.mode)}
                  className={cn(
                    "flex items-center justify-between rounded-2 border p-3 text-left transition-colors",
                    active
                      ? "border-accent bg-accent-soft/30 text-ink"
                      : "border-line bg-surface hover:bg-surface-2 text-ink-2"
                  )}
                >
                  <span className="text-[14px] font-medium">{opt.label}</span>
                  {active && (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-on-accent">
                      <Icon name="check" size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Account Details Section */}
        <section className="p-4 sm:p-6">
          <h2 className="font-display text-[16px] font-bold text-ink">
            Your Account
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">
            Account credentials and authentication are securely managed by Clerk.
          </p>

          {isLoaded && user && (
            <div className="mt-4 rounded-2 border border-line bg-surface-2/40 p-4">
              <div className="flex items-center gap-3">
                <Avatar
                  src={user.imageUrl}
                  name={user.fullName || user.firstName || "Nexora User"}
                  size={52}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[16px] font-bold text-ink">
                    {user.fullName || user.firstName}
                  </p>
                  <p className="truncate text-[13px] text-ink-3">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    Member since {formatJoined(user.createdAt?.toISOString())}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Danger / Session Section */}
        <section className="p-4 sm:p-6">
          <h2 className="font-display text-[16px] font-bold text-ink">
            Session
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">
            Sign out of your active Nexora account on this device.
          </p>

          <div className="mt-4">
            <Button
              variant="danger"
              size="md"
              onClick={() => setLogoutOpen(true)}
            >
              Sign out of Nexora
            </Button>
          </div>
        </section>
      </div>

      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </AppShell>
  );
}
