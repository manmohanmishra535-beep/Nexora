# Nexora implementation alignment

Last verified: 2026-11-17

This project follows the product scope in **Nexora Engineering Docs** and the visual
language in **Nexora Design System.html**. Where the brief asked us to keep Clerk and
Next.js App Router, the implementation deliberately differs from the reference stack.
This file is the single place that records those differences, the extra endpoints we
added, and the work that remains before a production launch.

## Stack at a glance

| Area | Reference docs | This implementation |
| --- | --- | --- |
| Authentication | Local JWT + bcrypt | **Clerk** (`@clerk/nextjs`, `@clerk/express`) |
| Routing | Next.js Pages Router, `/login` and `/register` | **App Router**, `/sign-in` and `/sign-up` |
| HTTP client | Axios instance | **`fetch` wrapper** in `frontend/lib/api.ts` + TanStack Query |
| Token transport | HTTP-only cookie | **`Authorization: Bearer <Clerk session JWT>`** on REST; `auth.token` on Socket.IO |
| Database | MongoDB + Mongoose | MongoDB + Mongoose (unchanged) |
| Realtime | Socket.IO | Socket.IO (unchanged) |
| Styling | Design-system tokens | Tokens in `frontend/app/tokens.css`, mapped to Tailwind v4 |
| Markdown/UI theme | Theme stored on profile | **`localStorage`** (`nexora-theme`) + system preference |
| Image storage | Cloudinary | Cloudinary with local-disk fallback |
| Tests | Jest / Supertest / Playwright | API suite (31 tests) + Playwright browser suite (6 tests); manual + type/build verification |

## Authentication and identity

- **Clerk replaces local password auth.** No password hashes, refresh-token tables, or
  local login endpoints exist. Clerk owns sign-up, sign-in, email verification, password
  reset, OAuth, and session refresh. `frontend/app/forgot-password/page.tsx` explains
  that reset is handled by Clerk.
- **Local profile mapping.** `backend/src/models/User.js` stores `clerkId` (unique). The
  first authenticated request creates the Mongo profile from Clerk; later requests
  refresh Clerk-owned fields. `upsertUserFromClerk` is used lazily by `requireAuth`
  and `optionalAuth`, so a missing profile never blocks a valid session. Profiles are
  keyed by the Clerk user id: signing in with a different Clerk account creates a
  separate local profile and does not inherit another account's posts or follows.
- **Sync endpoint.** `POST /api/users/sync` force-refreshes the profile and is rate-limited
  separately. It only updates email, avatar, and display name; a locally customised
  display name is preserved when Clerk has no name set.
- **Bearer tokens.** The browser sends the Clerk session token to the API. The backend
  verifies it through `clerkMiddleware()` / `getAuth()`. Socket.IO verifies the same
  token in its handshake with `verifyToken` from `@clerk/backend`.
- **Why not cookies for the API?** The frontend and API are separate origins in
  development, and the brief allowed a documented deviation. Bearer tokens avoid
  cross-site cookie issues and keep the Socket.IO handshake explicit. CORS still allows
  credentials because Clerk's own browser flow uses cookies.

### Clerk notes

- `frontend/proxy.ts` uses `createRouteMatcher` to protect app routes. Clerk currently
  prints a deprecation warning for this helper. The planned migration is to move auth
  checks into each protected layout/page; the current matcher is kept so the route list
  stays in one place.
- Clerk session tokens are short-lived. The SDK refreshes them automatically. The API
  passes `CLERK_CLOCK_SKEW_MS` (default `30000`) to `clerkMiddleware`, so a token minted a
  few seconds ahead of the server clock is accepted. Keep machine clocks on NTP in
  production; the skew allowance is a safety margin, not a substitute for time sync.

## Routes and protection

Public routes:

- `/sign-in`, `/sign-up`, `/forgot-password`
- `/[username]`, `/[username]/followers`, `/[username]/following`
- `/post/[id]`

Protected routes (redirect to `/sign-in` when signed out):

- `/`, `/explore`, `/notifications`, `/messages`, `/bookmarks`, `/settings`,
  `/profile`, `/edit-profile`

`/profile` and `/edit-profile` are redirects to the signed-in user's canonical profile
and settings editor. They exist so older links do not break.

## API contracts

### Errors

Every error uses the same body:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Check the highlighted fields.", "fields": { "content": "Write something first." } } }
```

Status codes: `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict,
`422` validation, `429` rate limited, `500` unexpected, `503` feature unavailable
(for example, the local disk failing to store an uploaded image).

Unexpected `500`s never expose stack traces. Intentional `AppError`s at `5xx`
(for example `UPLOAD_UNAVAILABLE`) keep their friendly message.

### Pagination

Cursor pagination uses `_id < cursor`, newest first. `limit` defaults to 20 and is capped
at 50. List responses are:

```json
{ "items": [], "nextCursor": "665f..." }
```

### Endpoints

```text
GET    /api/health
GET    /api/auth/me

POST   /api/users/sync                 (10 requests / 15 min)
GET    /api/users/me
PATCH  /api/users/me                   (multipart avatar optional)
GET    /api/users/search
GET    /api/users/suggestions
GET    /api/users/:username
GET    /api/users/:username/replies    (added for profile tabs)
GET    /api/users/:username/likes      (added for profile tabs)
GET    /api/users/:username/followers
GET    /api/users/:username/following
POST   /api/users/:id/follow
DELETE /api/users/:id/follow

GET    /api/posts/feed
GET    /api/posts/explore
GET    /api/posts/bookmarks
GET    /api/posts/user/:username
POST   /api/posts                      (multipart, up to 4 images)
GET    /api/posts/:id
PATCH  /api/posts/:id                  (added for post editing)
DELETE /api/posts/:id
POST   /api/posts/:id/like
DELETE /api/posts/:id/like
POST   /api/posts/:id/repost
DELETE /api/posts/:id/repost
POST   /api/posts/:id/bookmark
DELETE /api/posts/:id/bookmark
GET    /api/posts/:id/comments
POST   /api/posts/:id/comments

DELETE /api/comments/:id

GET    /api/notifications
GET    /api/notifications/unread-count
PATCH  /api/notifications/read

GET    /api/conversations
POST   /api/conversations
GET    /api/conversations/:id/messages
POST   /api/conversations/:id/messages
```

Socket.IO events:

```text
server -> client   notification:new, message:new, post:counts, follow:new,
                   typing:start, typing:stop
client -> server   message:send (ack), typing:start, typing:stop
```

## Posts and uploads

- Post text is trimmed and capped at **280 characters**.
- Up to **4 images** per post, **5 MB** each, restricted to JPEG, PNG, WebP, or GIF.
- Images are stored on Cloudinary when `CLOUDINARY_*` credentials are valid, with an
  automatic fallback to local disk (`backend/uploads/`, served at `/uploads`) when they
  are missing or rejected; Mongo keeps `{ url, publicId }` either way (local public ids
  are prefixed `local:`). Deleting a post
  deletes its images, comments, and notifications.
- The web composer previews images, enforces the limits client-side, and shows server
  validation errors next to the field.
- `next/image` is used for avatars and post images, but post images pass
  `unoptimized`. Cloudinary already performs width/quality/format transformations when
  configured, and adding the remote loader would require `remotePatterns` for every
  account host. This is a deliberate deviation; enable the Next.js optimizer when a
  stable Cloudinary host is configured. No `images` config is needed for local-fallback
  URLs: without `domains`/`remotePatterns`, `next/image` accepts any absolute URL.

### Current Cloudinary status

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Cloudinary is attempted first; a failure (missing variables, `Invalid Signature`, an
outage) logs a warning and stores the image on local disk instead, so posting images
never fails on provider configuration. In this workspace the configured API secret is
rejected by Cloudinary (`401 Invalid Signature`), so uploads currently land in
`backend/uploads/` and are served by the API at `/uploads` with
`Cross-Origin-Resource-Policy: cross-origin` (helmet's default is `same-origin`, which
would block the Next.js origin from embedding them). Local URLs are absolute and derive
their origin from `API_URL`, defaulting to `http://localhost:PORT`.

Verified end to end: mint a Clerk session token, `POST /api/posts` with an image →
`201` with a local URL, `GET` the image → `200 image/png` with the CORP header, render
it in the browser via `next/image` with no console errors, `DELETE` the post → file
removed and `404` on the URL. No credentials are committed; only `.env.example` is
tracked.

## Design system

- `frontend/app/tokens.css` is the single source for colour, type, radius, and motion
  tokens, mirroring **Nexora Design System.html**. Light and dark values are both
  defined there; `:root[data-theme]` overrides `prefers-color-scheme`.
- Tailwind v4's `@theme inline` maps the same variables to utilities such as
  `bg-surface`, `text-ink-3`, `rounded-2`, and `duration-hover`. A theme switch does not
  require a rebuild.
- Fonts (Bricolage Grotesque, Instrument Sans, JetBrains Mono) are loaded with
  `next/font/google` and exposed as `--f-display`, `--f-body`, `--f-mono`.
- The theme is a **client preference**, not a profile field. `ThemeProvider` stores
  `light`, `dark`, or `system` in `localStorage`, and a tiny inline script applies the
  saved value before paint to avoid a flash.
- All screens share `AppShell`, `PageHeader`, and the mobile bottom navigation. Auth
  screens share `AuthShell` so Clerk's widget sits inside the same tokenised frame.

## Realtime behaviour

- Notifications, unread counts, message lists, message threads, follow state, and post
  counts update from Socket.IO events. Toasts appear for new notifications when the user
  is not on `/notifications`.
- **Messages are sent over REST** (`POST /api/conversations/:id/messages`), and the server
  broadcasts `message:new`. The socket also accepts `message:send` with an ack for
  clients that prefer a pure socket transport; the web client keeps REST because it gives
  the same validation, persistence, and error shape as every other write.
- Typing indicators (`typing:start` / `typing:stop`) are an addition that matches the
  design system's live conversation state.
- After a reconnect, the client invalidates unread counts to catch up on missed events.

## Extra behaviour beyond the reference contract

- Post editing via the post menu, with optimistic cache patching, rollback on failure,
  and an `edited` marker.
- Optimistic like, repost, bookmark, follow, and delete actions with cache rollback and
  toasts, as required by the design system.
- Signed-out browsing of public profiles and post threads. Actions that need identity
  route to `/sign-in`; follow buttons and menus hide themselves.
- Profile tabs: Posts, Replies, Likes. The last two use the added `/replies` and `/likes`
  endpoints.
- Infinite scroll on feeds, explore, bookmarks, notifications, and profile tabs using a
  shared sentinel.
- `/profile` and `/edit-profile` compatibility redirects.

## Rate limiting

- Whole API: **100 requests / 15 minutes / IP** in production, **1000** in development.
- `/api/users/sync`: **10 requests / 15 minutes / IP**.
- Auth forms are hosted by Clerk, so there is no local login-throttling middleware.
  Clerk applies its own protections. This is an intentional difference from the docs'
  local auth limiter.

## Testing and performance status

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build` passes (App Router routes compile; Cache Components enabled).
- Verified manually in the browser: signed-out public profile and post pages, protected
  route redirects, home feed, composer, explore, notifications, bookmarks, messages
  empty state, settings, profile tabs, post detail, and the post-edit failure path.
- API smoke tests covered health, profile sync, feed/explore viewer flags, post editing
  (success and failure), and an image-upload round trip (create with image, serve over
  `/uploads`, render in the browser, delete with file cleanup).
- **API suite: Jest + Supertest in `backend/tests/` (`npm test`, 31 tests).** Covers auth
  (missing/garbage tokens, per-account profiles), post CRUD and validation (280 chars,
  ownership, id/404 handling), the like/repost/bookmark verb contracts — including the
  idempotency and `repostedByMe` viewer-flag behavior the client depends on for its
  toggle buttons — feed and explore cursor pagination, comments, and the local
  image-upload fallback (store, serve with the CORP header, delete with file cleanup).
  It runs against an isolated `nexora_test` database (dropped after each run) and mints
  real Clerk session tokens, so it needs network access. `src/server.js` exports the app
  and only listens when run directly, which lets supertest bind an ephemeral port.
- **Browser suite: Playwright in `frontend/e2e/` (`npm run test:e2e`, 6 tests).**
  It covers the flows where UI bugs actually surfaced: sign-in through Clerk testing
  tokens with a throwaway `nexora+clerk_test@example.com` account, composer post
  creation, the like/bookmark/repost toggle contracts asserted again after full page
  reloads (regressions for the inverted-verb fix and the `repostedByMe` serializer
  fix), image upload with a `naturalWidth` check proving the bytes loaded, the logout
  confirmation dialog, and signed-out redirects plus the public profile. It reuses
  already-running dev servers (starting them otherwise), keeps saved browser state in
  `frontend/e2e/.auth/` (gitignored), runs serially on one worker, and deletes the
  test account's posts in a global teardown. One-time setup:
  `npx playwright install chromium`; it needs network access for Clerk.
- **No Lighthouse/JS-budget measurement has been recorded.** Route-level code splitting
  and `next/image` are in place, but real lazy-loading and bundle-size checks remain
  launch work.

## Local environment notes

- Backend defaults to port `5000`; frontend to `3000`.
- `backend/src/config/database.js` forces DNS resolvers `8.8.8.8,1.1.1.1` because some
  Windows setups cannot resolve MongoDB SRV records through the local stub. Override with
  `DNS_SERVERS=...` when needed.
- The backend logs `CLOUDINARY_* is not set...` at startup when the CDN is not in use;
  uploads then go to `backend/uploads/` and are served at `/uploads`. `503
  UPLOAD_UNAVAILABLE` is reserved for the local disk failing to store an image.
- Do not commit `.env`, `.env.local`, `.tmp-jwt`, or sign-in tickets. They are ignored.

## Remaining launch work

1. Supply valid Cloudinary credentials to move images from local disk to the CDN
   (optional in local dev; uploads already work without it).
2. Measure bundle size and add lazy loading where the budget requires it.
3. Plan the `createRouteMatcher` migration to resource-based Clerk checks.
4. Sync server clocks with NTP in every environment that verifies Clerk tokens.
