# Nexora

Nexora is a small social network: write 280-character posts with up to four images,
follow people, reply, repost, bookmark, search, chat, and get live notifications.
It is built as a two-app workspace:

- **`frontend/`** — Next.js 16 App Router, React 19, Tailwind v4, TanStack Query, Clerk.
- **`backend/`** — Express 5, MongoDB/Mongoose, Socket.IO, Cloudinary, Clerk verification.

The UI follows the supplied **Nexora Design System** tokens, with light, dark, and system
themes. The implementation intentionally keeps Clerk and the App Router instead of the
reference docs' local JWT/bcrypt auth and Pages Router. Every deviation is documented in
[`docs/ALIGNMENT.md`](docs/ALIGNMENT.md).

## Features

- Home feed with **For you** and **Following** tabs, infinite scroll, and a composer.
- 280-character posts, up to **4 images** (5 MB each; JPEG, PNG, WebP, GIF).
- Post detail with replies.
- Like, repost, bookmark, edit, and delete with optimistic updates and rollback.
- Profiles with Posts / Replies / Likes tabs, follower and following lists.
- Follow/unfollow, user search, suggestions, and signed-out public profiles.
- Notifications with unread count and live toasts.
- Direct messages: conversation list, thread view, REST send, typing indicators.
- Bookmarks, explore, settings, theme switcher, and Clerk-hosted auth.
- Socket.IO updates for notifications, messages, counts, follows, and typing.

## Requirements

- Node.js 20+ (Node 24 is used locally).
- A MongoDB database (Atlas SRV or local).
- A Clerk application with the same publishable and secret keys on both apps.
- Cloudinary credentials for image uploads (optional — without them images are stored
  on local disk and served by the API).

## 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://...
CLIENT_URL=http://localhost:3000
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# Clock-drift tolerance for Clerk token verification (milliseconds)
CLERK_CLOCK_SKEW_MS=30000

# Optional — without these, images are stored on local disk (backend/uploads/)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

NODE_ENV=development
```

Run it:

```bash
npm run dev     # nodemon
# or
npm start
```

Health check: <http://localhost:5000/api/health> → `{ "status": "ok", "db": "connected" }`.

The server forces DNS resolvers `8.8.8.8,1.1.1.1` by default so MongoDB Atlas SRV lookups
work on Windows networks with a restrictive stub resolver. Override with
`DNS_SERVERS=...` if your environment needs different resolvers.

## 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

Fill in `frontend/.env.local`:

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

Run it:

```bash
npm run dev
```

Open <http://localhost:3000>. Keep the backend on port 5000 (or update
`NEXT_PUBLIC_API_URL` and `CLIENT_URL` together).

## Scripts

| Location | Command | Purpose |
| --- | --- | --- |
| `frontend/` | `npm run dev` | Next.js dev server |
| `frontend/` | `npm run build` | Production build |
| `frontend/` | `npm start` | Serve the production build |
| `frontend/` | `npx tsc --noEmit` | Type-check |
| `frontend/` | `npm run lint` | ESLint |
| `frontend/` | `npm run test:e2e` | Browser suite (Playwright) |
| `frontend/` | `npx next analyze` | Bundle analysis (Turbopack, writes `.next/diagnostics/analyze`) |
| `backend/` | `npm run dev` | Express with nodemon |
| `backend/` | `npm start` | Express once |
| `backend/` | `npm test` | API test suite (Jest + Supertest) |

## Project layout

```text
Nexora/
├─ backend/
│  ├─ src/
│  │  ├─ config/        env, database, Cloudinary
│  │  ├─ controllers/   auth, users, posts, comments, notifications, messages
│  │  ├─ middleware/    Clerk auth, validation, uploads, rate limits, errors
│  │  ├─ models/        User, Post, Comment, Notification, Conversation, Message
│  │  ├─ realtime/      Socket.IO handshake and event relay
│  │  ├─ routes/        REST routes
│  │  ├─ services/      message persistence/broadcast
│  │  ├─ utils/         AppError, pagination, serializers, Clerk upsert, image storage
│  │  └─ server.js
│  └─ .env.example
├─ frontend/
│  ├─ app/              App Router pages, (app) shell, auth pages, tokens.css
│  ├─ components/       AppShell, Composer, PostCard, Feed, ProfileHeader, ui/*
│  ├─ hooks/            useApi, useNexora, usePostActions
│  ├─ lib/              api client, cache helpers, types, formatters
│  ├─ proxy.ts          Clerk route protection
│  └─ .env.example
├─ docs/
│  ├─ ALIGNMENT.md      deviations, contracts, and remaining work
│  └─ DEPLOYMENT.md     Render backend + Vercel frontend checklist
├─ render.yaml          Render blueprint for the API
└─ README.md
```

## API shape

- REST base: `http://localhost:5000/api`
- Auth: `Authorization: Bearer <Clerk session token>`
- Errors: `{ "error": { "code", "message", "fields?" } }`
- Lists: `{ "items": [...], "nextCursor": string | null }` (cursor `_id < cursor`,
  20 per page by default, maximum 50)
- Socket.IO: handshake `auth.token`, then notifications, messages, counts, follows,
  and typing events.

The complete endpoint table is in [`docs/ALIGNMENT.md`](docs/ALIGNMENT.md).

## Known limitations

- **Image storage falls back to local disk.** Uploads use Cloudinary when the
  `CLOUDINARY_*` credentials are valid; when they are missing or rejected (as in this
  workspace, where the API secret fails with `Invalid Signature`), images are stored in
  `backend/uploads/` and served at `/uploads`. Fixing `.env` switches to the CDN with no
  code changes.
- **Both test suites need network access** because they mint real Clerk session
  tokens: `npm test` in `backend/` runs 44 API tests against an isolated `nexora_test`
  MongoDB database (dropped after each run), and `npm run test:e2e` in `frontend/`
  runs 14 browser tests in Chromium against the dev servers — run
  `npx playwright install chromium` once first. The browser suite signs a throwaway
  `nexora+clerk_test@example.com` account in via Clerk testing tokens and deletes
  that account's posts afterwards.
- The Next.js image optimizer is disabled for post images (`unoptimized`) because
  Cloudinary transforms them when configured (the local fallback stores originals).

## Documentation

- [`docs/ALIGNMENT.md`](docs/ALIGNMENT.md) — every deviation from the engineering docs,
  the full API surface, security notes, and launch work.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploying the API to Render and the
  frontend to Vercel, with the full environment-variable checklist.
- `frontend/README.md` — frontend-specific setup and architecture.
