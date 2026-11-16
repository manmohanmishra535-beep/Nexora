"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import Icon from "@/components/ui/Icon";

export default function PageHeader({
  title,
  subtitle,
  back = false,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const router = useRouter();

  return (
    <header className="sticky top-14 z-30 flex min-h-[53px] items-center gap-4 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur min-[720px]:top-0">
      {back && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink transition-colors duration-hover hover:bg-surface-2"
        >
          <Icon name="back" size={20} />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[20px] font-bold leading-tight text-ink">
          {title}
        </h1>

        {subtitle && (
          <p className="truncate text-[12px] text-ink-3">{subtitle}</p>
        )}
      </div>

      {action}
    </header>
  );
}
