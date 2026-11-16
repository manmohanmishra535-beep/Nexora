import { Suspense } from "react";

import AppShell from "@/components/AppShell";
import { SocketProvider } from "@/components/RealtimeProvider";

/**
 * Public routes such as /[username] use runtime params, so usePathname in the
 * shell suspends while the route is prerendered. The Suspense boundary keeps
 * the rest of the static shell buildable.
 */
function AppFrameFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg text-[13px] text-ink-3">
      Loading Nexora…
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AppFrameFallback />}>
      <SocketProvider>
        <AppShell>{children}</AppShell>
      </SocketProvider>
    </Suspense>
  );
}
