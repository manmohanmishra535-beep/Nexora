import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared shell for sign-in, sign-up and password reset. Everything here is
 * token-driven so the auth screens follow the same light/dark themes as the app.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-28 -top-28 h-72 w-72 rounded-full bg-accent-soft opacity-70 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-accent-soft opacity-50 blur-3xl" />
      </div>

      <div
        className={`relative w-full ${wide ? "max-w-[440px]" : "max-w-[420px]"}`}
      >
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2.5"
          aria-label="Nexora home"
        >
          <span className="h-3 w-3 rounded-full bg-accent" aria-hidden="true" />
          <span className="font-display text-[26px] font-bold tracking-[-.01em] text-ink">
            Nexora
          </span>
        </Link>

        <section className="rounded-3 border border-line bg-surface p-6 sm:p-8">
          <h1 className="text-center font-display text-[24px] font-bold leading-tight text-ink">
            {title}
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-center text-[13px] leading-6 text-ink-2">
            {subtitle}
          </p>

          <div className="mt-6">{children}</div>
        </section>

        {footer && (
          <div className="mt-6 text-center text-[13px] leading-6 text-ink-3">
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}
