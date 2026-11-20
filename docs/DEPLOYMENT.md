# Deployment

Target topology:

- **Backend (API + Socket.IO) → Render** — it needs a long-running process for
  WebSockets and a writable working directory for the local-disk upload fallback.
  Vercel Functions cannot serve either.
- **Frontend (Next.js) → Vercel** — standard Next.js app; no custom config needed.

This document is the step-by-step checklist. Status: the code and blueprint are
ready (`render.yaml`, health-check exemption, `engines.node`), the accounts and
secrets below are the only manual steps.

---

## 1. Backend on Render

### Create the service

1. Render Dashboard → **New → Blueprint**, connect this repository.
   `render.yaml` (repo root) is detected automatically: `rootDir: backend`,
   build `npm ci`, start `npm start`, health check `/api/health`.
2. Or manually: **New → Web Service** → root directory `backend`, runtime Node,
   build command `npm ci`, start command `npm start`, health check path
   `/api/health`.
3. Node version comes from `backend/package.json` `engines` (`>=20`). Render
   currently defaults to 22.x; pin with a `NODE_VERSION` env var if needed.

### Environment variables

| Key | Value | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Enables the 100 req/15 min API limit and combined logs |
| `MONGODB_URI` | Atlas connection string | Atlas → Network Access must allow Render egress (see below) |
| `CLERK_SECRET_KEY` | `sk_...` | **Same Clerk application as the frontend** |
| `CLERK_PUBLISHABLE_KEY` | `pk_...` | Same application as the frontend |
| `CLERK_CLOCK_SKEW_MS` | `30000` | Optional; matches the local default |
| `CLIENT_URL` | `https://<vercel-domain>` | Comma-separated **exact** origins for CORS and Socket.IO |
| `API_URL` | `https://<service>.onrender.com` | Used in absolute URLs for locally stored images; falls back to Render's auto-injected `RENDER_EXTERNAL_URL` |
| `CLOUDINARY_CLOUD_NAME` `CLOUDINARY_API_KEY` `CLOUDINARY_API_SECRET` | from the Cloudinary dashboard | Required for images to survive redeploys |
| `PORT` | — | Do not set; Render injects it |

`CLIENT_URL` accepts several origins (`https://a.vercel.app,https://b.vercel.app`)
and gates both the REST CORS headers and the Socket.IO handshake, so add every
origin you actually browse from — including any Vercel preview URL you test on.

### MongoDB Atlas network access

Atlas → Network Access → add `0.0.0.0/0` (simplest), or Render's static outbound
IPs if the service is on a paid plan. Without this, `/api/health` returns 503
(`db: "disconnected"`) and Render restarts the service in a loop.

### What already handles Render correctly

- Listens on `0.0.0.0:$PORT` (injected by Render).
- `trust proxy` is set, so rate limiting sees the real client IP behind Render's
  proxy instead of throttling everyone under one address.
- Health probes are exempt from the API rate limiter — a throttled probe would
  otherwise look like a dead service and trigger a restart loop.
- CORS and the Socket.IO handshake share the same comma-separated allowlist.
- Fallback image URLs use `API_URL`, and fall back to Render's auto-injected
  `RENDER_EXTERNAL_URL`, so local-disk images stay reachable even if `API_URL`
  is forgotten.
- In production, the startup log warns when `CLIENT_URL` is missing or still
  local, or when no public API origin is set — check the Render logs after the
  first deploy.
- Render supports WebSockets without extra configuration.

### Gotchas

- **Free plan sleeps after 15 minutes of inactivity** → the next request takes
  ~30–60 s (cold start), and open sockets drop. Paid Starter avoids this.
- **The working directory is ephemeral.** If Cloudinary rejects an upload the
  image is written to local disk and disappears on the next deploy — fixing the
  Cloudinary secret (see `docs/ALIGNMENT.md`, remaining work item 1) removes
  this failure mode.
- `DNS_SERVERS` is not needed: only the local Windows resolver had the Atlas SRV
  lookup problem.

### Verify

```bash
curl -i https://<service>.onrender.com/api/health
# 200 {"status":"ok","db":"connected"}

curl -i https://<service>.onrender.com/api
# 200 {"name":"Nexora API", ...}

curl -i -X OPTIONS https://<service>.onrender.com/api/posts \
  -H "Origin: https://<vercel-domain>" \
  -H "Access-Control-Request-Method: POST"
# access-control-allow-origin: https://<vercel-domain>
```

Then, after the frontend is pointed at this service: sign in, publish a post,
upload an image (URL should be `res.cloudinary.com/...`), and exchange a DM
between two accounts to confirm the socket path.

---

## 2. Frontend on Vercel

1. Vercel → **Add New → Project** → import this repository.
2. Root directory: `frontend`. Framework: Next.js (auto-detected).
3. Environment variables:

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://<service>.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://<service>.onrender.com` (optional if it equals the API URL) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_...` (same Clerk application) |
| `CLERK_SECRET_KEY` | `sk_...` (used by `proxy.ts` for server-side auth) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/` |

4. After the first deploy, copy the domain(s) into the backend's `CLIENT_URL`
   and redeploy the backend (env var changes require a restart on Render).

Notes:

- **Production builds fail fast** when `NEXT_PUBLIC_API_URL` is missing, with an
  error pointing at this document — a deploy can never silently ship an app that
  calls localhost.
- **Preview deployments** each get a new origin. Either add them to
  `CLIENT_URL` when testing, or stick to the production domain for real usage.
- **Clerk**: a `pk_test` instance is fine for demos, but a real launch needs a
  production instance with the Vercel domain configured in the Clerk dashboard.

---

## 3. Order of operations

1. Atlas network access updated.
2. Cloudinary secret fixed and one authenticated upload verified.
3. Backend deployed on Render; `/api/health` and CORS checks pass.
4. Frontend deployed on Vercel with the backend URL in its env.
5. Backend `CLIENT_URL` updated with the Vercel domain; backend redeployed.
6. Clerk production instance switched on (for a public launch).
7. End-to-end check: sign-in, post, image upload, DM, notification, logout.
