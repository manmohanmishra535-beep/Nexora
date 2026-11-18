# Nexora frontend

The Nexora web app: Next.js 16 App Router, React 19, Tailwind CSS v4, TanStack Query,
Clerk, and Socket.IO. It talks to the Express API in `../backend`.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required `.env.local` values:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_API_URL=http://localhost:5000
# Optional; defaults to NEXT_PUBLIC_API_URL
# NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Start the backend on port 5000 (see the root README) before opening
<http://localhost:3000>.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npx tsc --noEmit` | Type-check without emitting |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Browser suite (Playwright) |

## Structure

```text
app/
├─ (app)/                 signed-in shell and app screens
│  ├─ page.tsx            home feed
│  ├─ explore/
│  ├─ notifications/
│  ├─ bookmarks/
│  ├─ messages/           conversation list and [id] thread
│  ├─ settings/
│  ├─ [username]/         profile, followers, following
│  ├─ post/[id]/          post detail and replies
│  ├─ profile/            redirect to own profile
│  └─ edit-profile/       redirect to settings
├─ sign-in/ sign-up/      Clerk widgets inside AuthShell
├─ forgot-password/       Clerk reset guidance
├─ tokens.css             canonical design tokens
├─ globals.css            base styles + Tailwind import
├─ layout.tsx             fonts, metadata, theme bootstrap
└─ providers.tsx          Clerk, TanStack Query, theme, toasts

components/               AppShell, Composer, PostCard, Feed, ProfileHeader,
                          CommentSection, RightRail, ThemeProvider,
                          RealtimeProvider, UserSync, ui/*
hooks/                    useApi, useNexora, usePostActions
lib/                      api client, query-cache helpers, types, formatters
proxy.ts                  Clerk protected-route matcher
```

## Auth and data flow

- Clerk owns identity. `proxy.ts` protects `/`, `/explore`, `/notifications`,
  `/messages`, `/bookmarks`, `/settings`, and the profile redirects. Public profiles,
  follower lists, and post threads remain readable while signed out.
- `useApi()` asks Clerk for a session token and sends
  `Authorization: Bearer <token>` to every API call. Components never call `fetch`
  directly.
- TanStack Query owns server state. Feed and profile tabs use infinite queries with
  cursor pagination.
- Likes, reposts, bookmarks, follows, deletes, and edits patch the query cache first and
  roll back with a toast if the API fails.
- `RealtimeProvider` connects Socket.IO with the same Clerk token and updates
  notifications, messages, post counts, follow state, and typing indicators.
- `UserSync` calls `/api/users/sync` once per signed-in app mount to create/refresh the
  local Mongo profile. A failed sync is non-fatal because `requireAuth` also provisions
  the profile lazily.

## Design tokens and themes

- Every colour, radius, type family, and duration comes from `app/tokens.css`. Tailwind
  v4's `@theme inline` maps those variables to utilities (`bg-surface`, `text-ink-3`,
  `rounded-2`, `duration-hover`, and so on).
- Light and dark palettes are defined in the same file. `:root[data-theme="dark"]`
  overrides the media query.
- `ThemeProvider` stores `light`, `dark`, or `system` under `nexora-theme` in
  `localStorage`. An inline script in `app/layout.tsx` applies the saved theme before
  paint to prevent a flash.
- Fonts are loaded with `next/font/google`: Bricolage Grotesque (display),
  Instrument Sans (body), and JetBrains Mono (numbers/mono accents).

## Feature notes

- Composer: 280 characters, up to four images, 5 MB each, JPEG/PNG/WebP/GIF, previews,
  and inline validation.
- Feed: For you (explore) and Following, with infinite scroll.
- Profiles: Posts / Replies / Likes tabs, follow button, follower and following lists.
  The replies and likes tabs use the backend's extra profile endpoints.
- Post actions: like, repost, bookmark, copy link, open thread, edit, and delete. Editing
  is inline and only appears for your own posts.
- Signed out: public profile and post pages still render; actions that need identity
  route to `/sign-in`.
- Messages: REST send with optimistic append, Socket.IO delivery, typing indicators,
  auto-scroll, and conversation search when composing.
- Images use `next/image`; post images pass `unoptimized` because Cloudinary applies
  width/quality/format transformations when configured (the local fallback stores
  originals).

## Known limitations

- Image uploads work out of the box: they go to Cloudinary when the backend has valid
  `CLOUDINARY_*` credentials, otherwise the API stores them on local disk
  (`backend/uploads/`) and serves them at `/uploads`.
- Browser tests live in `e2e/` (`npm run test:e2e`, Playwright); one-time setup is
  `npx playwright install chromium`. `npx tsc --noEmit` and `npm run build` remain
  the static checks.
- `createRouteMatcher` in `proxy.ts` triggers a Clerk deprecation warning; the migration
  plan is in `../docs/ALIGNMENT.md`.

See [`../docs/ALIGNMENT.md`](../docs/ALIGNMENT.md) for the full deviation log and API
contract.
