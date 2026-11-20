import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk deprecated `createRouteMatcher()` gates in middleware: the signed-out
 * check now lives with the resources it protects, in
 * `app/(app)/(protected)/layout.tsx`, which owns the protected route group.
 *
 * This middleware keeps only a *soft* early redirect for those same paths so
 * signed-out visitors get an instant 307 (and no JS is needed to reach
 * sign-in) instead of waiting for Clerk to hydrate in the browser. It is a
 * performance optimization, not the guarantee — if this list drifts from the
 * route group, the layout gate still catches every route in the group.
 */
const SOFT_PROTECTED_PATHS = [
  "/explore",
  "/notifications",
  "/messages",
  "/bookmarks",
  "/settings",
  "/profile",
  "/edit-profile",
];

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname === "/" ||
    SOFT_PROTECTED_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );

  if (!isProtected) {
    return;
  }

  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
