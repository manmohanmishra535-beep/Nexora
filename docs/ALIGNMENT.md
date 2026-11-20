# Nexora implementation alignment

Last verified: 2026-11-20

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
| Tests | Jest / Supertest / Playwright | API suite (44 tests) + Playwright browser suite (14 tests); manual + type/build verification |

## Authentication and identity

- **Clerk replaces local password auth.** No password hashes, refresh-token tables, or
  local login endpoints exist. Clerk owns sign-up, sign-in, email verification, password
  reset, OAuth, and session refresh. `frontend/app/forgot-password/page.tsx` drives
  Clerk's reset flow end to end (email → verification code → new password) with the
  design system's own fields instead of Clerk's widget.
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

- The signed-out check is resource-based; see *Routes and protection* below for the
  route group, the soft `proxy.ts` redirect, and how the layout gate was verified.
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

Protection is resource-based (Clerk's post-`createRouteMatcher` model): those eight
routes live in the `app/(app)/(protected)/` route group, whose layout performs the
signed-out redirect, while `proxy.ts` keeps only a soft early redirect for the same
paths as a performance optimization. The layout gate was verified by running the
signed-out browser tests with the middleware redirect disabled; both passed.

Auth pages (`/sign-in`, `/sign-up`, `/forgot-password`) render a loading state
until Clerk resolves, so no half-wired form ever appears, and they send an
already-signed-in visitor away: to the `redirect_url` query param when it is a
safe same-site path (that is where the signed-out redirect was sending them),
otherwise `/`. Off-site targets (`//host`, `/\host`, absolute URLs) and targets
pointing back at an auth page are rejected, so the redirect can neither leave
the site nor loop. Covered by `e2e/auth-redirect.spec.ts` (signed-in redirect)
and the signed-out form checks in `e2e/public.spec.ts` (the loading guard must
not strand visitors on the loading screen).

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
- **API suite: Jest + Supertest in `backend/tests/` (`npm test`, 44 tests).** Covers auth
  (missing/garbage tokens, per-account profiles), post CRUD and validation (280 chars,
  ownership, id/404 handling), the like/repost/bookmark verb contracts — including the
  idempotency and `repostedByMe` viewer-flag behavior the client depends on for its
  toggle buttons — feed and explore cursor pagination, comments, follow idempotency
  with follower/following lists and self/malformed/404 guards, the notification
  unread-count → list → mark-read contracts, the conversation and message contracts
  (a pair shares one conversation, newest-first message pages, validation, 404s), and
  the local image-upload fallback (store, serve with the CORP header, delete with file
  cleanup). It runs against an isolated `nexora_test` database (dropped after each run)
  and mints real Clerk session tokens, so it needs network access. `src/server.js`
  exports the app and only listens when run directly, which lets supertest bind an
  ephemeral port.
- **Browser suite: Playwright in `frontend/e2e/` (`npm run test:e2e`, 14 tests).**
  It covers the flows where UI bugs actually surfaced: sign-in through Clerk testing
  tokens with a throwaway `nexora+clerk_test@example.com` account, composer post
  creation, the like/bookmark/repost toggle contracts asserted again after full page
  reloads (regressions for the inverted-verb fix and the `repostedByMe` serializer
  fix), image upload with a `naturalWidth` check proving the bytes loaded, the logout
  confirmation dialog, signed-out redirects plus the public profile, the auth-page
  redirect decision (signed-in visitors leave for a safe `redirect_url` or `/`, and
  off-site or looping targets fall back home), the signed-out rendering of the
  sign-up and password-reset forms after Clerk resolves (the loading guard must not
  strand visitors), the robots.txt contract (a real text/plain robots file rather
  than the `[username]` catch-all), and a realtime
  test proving the deferred `socket.io-client` chunk still opens the backend
  WebSocket after hydration. That realtime test exposed a duplicate `/` route — a
  second `app/page.tsx` shadowed `app/(app)/page.tsx`, so the home feed rendered
  outside the `(app)` layout and never mounted `SocketProvider`; the two pages were
  consolidated into `app/(app)/page.tsx`, keeping the visible design. The suite
  reuses already-running dev servers (starting them otherwise), keeps saved browser
  state in `frontend/e2e/.auth/` (gitignored), runs serially on one worker, and
  deletes the test account's posts in a global teardown. One-time setup:
  `npx playwright install chromium`; it needs network access for Clerk.
- **Bundle-size budget recorded with `next analyze` (built into Turbopack, v16.1+).**
  First-load client JS per route — read from the prerendered HTML's script tags and
  gzipped (re-measured 2026-11-19, deterministic against a second clean build):
  shared baseline 244.1 KB (11 chunks), content routes 261.9–267.1 KB (worst:
  `/`), auth routes 248.6–248.7 KB. Budget: content ≤ 275 KB, auth
  ≤ 255 KB, baseline ≤ 250 KB, route delta over baseline ≤ 25 KB — every route
  passes (tightest margin: home at +22.9 KB). Content routes were 279.6–284.9 KB (over budget) before
  `socket.io-client` (12.9 KB gz) moved from a static import in `RealtimeProvider`
  to a dynamic import loaded after hydration; `e2e/realtime.spec.ts` guards that the
  connection still opens. Reproduce: `npm run build`, then `npx next analyze
  --output --snapshot <name>` and `npx next analyze export --snapshot <name>` for a
  JSONL record to diff; per-route gzip totals come from the `/_next/static/*.js`
  script tags in each file under `.next/server/app/**/*.html`.
- **First Lighthouse run recorded 2026-11-20** (Lighthouse 13.6.0, lab, signed-out
  pages against a production `next start` build; default mobile preset = simulated
  Slow 4G + 4× CPU throttle, medians of 3 runs): `/sign-in` — performance 48,
  accessibility 100, best-practices 77, SEO 100; `/manmohanmishra535` —
  performance 45, accessibility 100, best-practices 73, SEO 100. Desktop preset:
  performance 94 and 85. CLS 0 on both; FCP 2.0 s; TBT median 1.6 s / 2.3 s under
  the 4× throttle, dominated by Clerk's third-party script. The run surfaced a real
  defect — `/robots.txt` was answered by the dynamic `/[username]` route as an HTML
  profile page — fixed with `app/robots.ts` (SEO 91 → 100) and locked by an e2e
  contract test. The remaining failures are external or test-setup artifacts:
  `third-party-cookies` and `inspector-issues` come from Clerk's
  `*.clerk.accounts.dev` test domain, and the profile page's `errors-in-console`
  are CORS rejections of the temporary Lighthouse origin, which doubles as live
  proof that the API allowlist rejects unknown origins. Reproduce: `npx lighthouse
  --only-categories=performance,accessibility,best-practices,seo
  --chrome-flags="--headless=new"`, 3 runs taking the median — single runs on a
  busy machine varied by ~10 points (45–57 observed).
- **Dependency audit clean (`npm audit`, both projects: 0 vulnerabilities).** The
  frontend needed only semver-range bumps inside its lint toolchain (typescript-eslint
  8.73.0 and its minimatch). The backend's 19 moderate advisories were all dev-only
  and had no non-breaking upstream fix: `jest@30.5.2` pins glob@13 (fixed glob starts
  at 14.0.2) and `nodemon@3.1.14` pins minimatch@^10 (fixed starts at 11.0.1), so
  `backend/package.json` adds `overrides: { "glob": "^14.0.6", "minimatch": "^11.0.9" }`
  to force the patched majors. Verified against the exact call sites the toolchain
  uses (`glob.sync` in `@jest/reporters`/`test-exclude`, `minimatch()` with
  `windowsPathsNoEscape` in nodemon), the 31-test API suite plus a coverage run, and a
  nodemon dev-server restart with a watch-triggered file reload. Production trees were
  never affected — every advisory lived under the test/dev toolchain. Drop the
  overrides once jest/nodemon declare fixed ranges themselves.

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

1. Replace `CLOUDINARY_API_SECRET` in `backend/.env` with the current secret from
   the Cloudinary dashboard (Settings → API keys). The API key itself is valid —
   the admin ping answers `api_secret mismatch`, and no local HMAC (SHA-1 or
   SHA-256, with or without the image transformation) reproduces the signatures
   Cloudinary computes, so only the secret is wrong (likely rotated or mistyped).
   Verify with one authenticated upload after replacing it. Uploads already work
   via the local-disk fallback meanwhile, so this only gates CDN delivery.
2. Enable NTP time sync on this Windows dev machine — the only environment that
   currently verifies Clerk tokens. `w32tm /query /status` shows stratum 0 /
   "Local CMOS Clock" with no successful sync, and `w32tm /resync` is denied
   without elevation. The measured offset against authoritative web time is 3 s,
   well inside the API's 30 s `CLERK_CLOCK_SKEW_MS`, so tokens verify today;
   when hardening, run elevated
   `w32tm /config /syncfromflags:manual /manualpeerlist:"time.windows.com,time.cloudflare.com" && w32tm /resync`,
   and configure NTP in any deployed environment.
3. Deploy — backend on Render (blueprint: `render.yaml`), frontend on Vercel.
   The code is deploy-ready (`docs/DEPLOYMENT.md` has the full checklist): health
   probes are exempt from the rate limiter, `engines.node` pins Node 20+, CORS and
   Socket.IO read the same comma-separated `CLIENT_URL`, and a production-mode
   smoke test verified the health endpoint, allowed/blocked origins, and 120
   consecutive probes without throttling. What remains needs your accounts: Render
   + Vercel, Atlas network access for Render, and items 1–2 above.
