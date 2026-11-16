import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Reading a profile or a single post is public. Everything that needs a
 * session (feed, notifications, messages, saved posts, settings) is protected.
 */
const isProtectedRoute = createRouteMatcher([
  "/",
  "/explore(.*)",
  "/notifications(.*)",
  "/messages(.*)",
  "/bookmarks(.*)",
  "/settings(.*)",
  "/profile(.*)",
  "/edit-profile(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
