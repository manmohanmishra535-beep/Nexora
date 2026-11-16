"use client";

import { cn } from "@/lib/cn";

type TabsProps<T extends string> = {
  tabs: readonly T[];
  value: T;
  onChange: (tab: T) => void;
  label: string;
  className?: string;
};

export default function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex border-b border-line", className)}
    >
      {tabs.map((tab) => {
        const selected = tab === value;

        return (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(tab)}
            className={cn(
              "relative h-12 flex-1 font-display text-[15px] font-semibold transition-colors duration-hover hover:bg-surface-2",
              selected ? "text-ink" : "text-ink-2"
            )}
          >
            {tab}

            {selected && (
              <span
                aria-hidden="true"
                className="absolute bottom-[-1px] left-1/2 h-1 w-14 -translate-x-1/2 rounded-pill bg-accent"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
