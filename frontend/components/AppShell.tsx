"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";

import RightRail from "@/components/RightRail";
import UserSync from "@/components/UserSync";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Icon, { type IconName } from "@/components/ui/Icon";
import { useMyProfile, useUnreadCount } from "@/hooks/useNexora";
import { cn } from "@/lib/cn";

type NavItem = {
  label: string;
  icon: IconName;
  href: string;
  match: (path: string) => boolean;
};

export default function AppShell({
  children,
  activePage,
}: {
  children: React.ReactNode;
  activePage?: string;
}) {
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const me = useMyProfile(Boolean(isSignedIn));
  const unread = useUnreadCount(Boolean(isSignedIn));

  const username =
    me.data?.username || user?.username || user?.firstName?.toLowerCase() || "";
  const profileHref = username ? `/${username}` : "/profile";

  const navigation: NavItem[] = [
    { label: "Home", icon: "home", href: "/", match: (p) => p === "/" },
    {
      label: "Explore",
      icon: "search",
      href: "/explore",
      match: (p) => p.startsWith("/explore"),
    },
    {
      label: "Notifications",
      icon: "bell",
      href: "/notifications",
      match: (p) => p.startsWith("/notifications"),
    },
    {
      label: "Messages",
      icon: "mail",
      href: "/messages",
      match: (p) => p.startsWith("/messages"),
    },
    {
      label: "Bookmarks",
      icon: "bookmark",
      href: "/bookmarks",
      match: (p) => p.startsWith("/bookmarks"),
    },
    {
      label: "Profile",
      icon: "user",
      href: profileHref,
      match: (p) =>
        p === "/profile" ||
        (Boolean(username) && p === `/${username}`),
    },
    {
      label: "Settings",
      icon: "settings",
      href: "/settings",
      match: (p) => p.startsWith("/settings"),
    },
  ];

  const badge = unread.data || 0;

  if (!isLoaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-[13px] text-ink-3">
        Loading Nexora…
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1290px]">
      <UserSync />

      <a
        href="#main"
        className="sr-only rounded-1 bg-surface px-3 py-2 focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        Skip to content
      </a>

      {/* Mobile header */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur min-[720px]:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-accent" aria-hidden="true" />
          <span className="font-display text-[20px] font-bold tracking-[-.01em]">
            Nexora
          </span>
        </Link>

        <Link
          href={isSignedIn ? profileHref : "/sign-in"}
          aria-label={isSignedIn ? "Your profile" : "Sign in"}
          className="rounded-full"
        >
          <Avatar
            src={user?.imageUrl}
            name={user?.fullName || user?.firstName || "N"}
            size={32}
          />
        </Link>
      </header>

      {/* Full navigation */}
      <aside className="sticky top-0 hidden h-screen w-[clamp(220px,20vw,275px)] shrink-0 flex-col px-3 py-4 min-[1000px]:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-2">
          <span className="h-3 w-3 rounded-full bg-accent" aria-hidden="true" />
          <span className="font-display text-[20px] font-bold tracking-[-.01em]">
            Nexora
          </span>
        </Link>

        <nav aria-label="Main" className="mt-2 grid gap-0.5">
          {navigation.map((item) => {
            const active = item.match(pathname);

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-12 items-center gap-4 rounded-pill px-4 font-display text-[18px] text-ink transition-colors duration-hover hover:bg-surface-2",
                  active ? "font-bold" : "font-medium"
                )}
              >
                <span className="relative flex">
                  <Icon name={item.icon} size={24} />
                </span>

                <span className="flex flex-1 items-center gap-2">
                  {item.label}

                  {item.label === "Notifications" && badge > 0 && (
                    <span className="ml-auto rounded-pill bg-accent px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-on-accent">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        <Link
          href="/"
          className="mt-4 flex h-10 items-center justify-center rounded-pill bg-accent px-[18px] text-sm font-semibold text-on-accent transition-opacity duration-hover hover:opacity-90"
        >
          Post
        </Link>

        <div className="mt-auto border-t border-line pt-3">
          {isSignedIn ? (
            <div className="flex items-center gap-2.5 px-1">
              <Link href={profileHref} className="rounded-full">
                <Avatar
                  src={user?.imageUrl}
                  name={user?.fullName || user?.firstName || "N"}
                  size={32}
                />
              </Link>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">
                  {me.data?.displayName || user?.fullName || "Nexora User"}
                </p>
                <p className="truncate text-[12px] text-ink-3">
                  @{username || "user"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => signOut({ redirectUrl: "/sign-in" })}
                aria-label="Sign out"
                title="Sign out"
                className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition-colors duration-hover hover:bg-surface-2 hover:text-ink"
              >
                <Icon name="logout" size={18} />
              </button>
            </div>
          ) : (
            <div className="grid gap-2 px-1">
              <Link href="/sign-in">
                <Button variant="secondary" size="sm" block>
                  Log in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm" block>
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Compact icon navigation (720–999px) */}
      <aside className="sticky top-0 hidden h-screen w-[88px] shrink-0 flex-col items-center py-4 min-[720px]:flex min-[1000px]:hidden">
        <Link
          href="/"
          aria-label="Nexora home"
          className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-accent-soft"
        >
          <span className="h-3 w-3 rounded-full bg-accent" />
        </Link>

        <nav aria-label="Main compact" className="grid gap-1">
          {navigation.map((item) => {
            const active = item.match(pathname);

            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative grid h-12 w-12 place-items-center rounded-pill transition-colors duration-hover hover:bg-surface-2",
                  active ? "font-bold text-ink" : "text-ink-2"
                )}
              >
                <Icon name={item.icon} size={24} />

                {item.label === "Notifications" && badge > 0 && (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-pill bg-accent px-1 text-[10px] font-semibold text-on-accent">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <Link href="/" className="mt-4" aria-label="Write a post">
          <span className="grid h-11 w-11 place-items-center rounded-pill bg-accent text-on-accent transition-opacity duration-hover hover:opacity-90">
            <Icon name="plus" size={22} />
          </span>
        </Link>
      </aside>

      <main
        id="main"
        className="min-h-screen min-w-0 flex-1 border-line bg-surface pb-16 min-[720px]:border-x min-[720px]:pb-0 min-[1000px]:max-w-[640px]"
      >
        {children}
      </main>

      <aside className="sticky top-0 hidden h-screen w-[clamp(280px,26vw,350px)] shrink-0 min-[1000px]:block">
        <RightRail signedIn={Boolean(isSignedIn)} />
      </aside>

      {/* Bottom tab bar (below 720px) */}
      <nav
        aria-label="Main bottom"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(56px+env(safe-area-inset-bottom,0px))] items-stretch border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur min-[720px]:hidden"
      >
        {navigation.slice(0, 5).map((item) => {
          const active = item.match(pathname);

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 items-center justify-center",
                active ? "text-accent" : "text-ink-3"
              )}
            >
              <Icon name={item.icon} size={24} filled={active} />

              {item.label === "Notifications" && badge > 0 && (
                <span className="absolute right-[calc(50%-18px)] top-1.5 grid h-4 min-w-4 place-items-center rounded-pill bg-accent px-1 text-[10px] font-semibold text-on-accent">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </Link>
          );
        })}

        <Link
          href={isSignedIn ? profileHref : "/sign-in"}
          aria-label="Profile"
          className="flex flex-1 items-center justify-center text-ink-3"
        >
          <Avatar
            src={user?.imageUrl}
            name={user?.fullName || user?.firstName || "N"}
            size={28}
          />
        </Link>
      </nav>
    </div>
  );
}
