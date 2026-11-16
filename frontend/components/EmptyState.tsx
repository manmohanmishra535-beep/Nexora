import type { ReactNode } from "react";

import Icon, { type IconName } from "@/components/ui/Icon";

export default function EmptyState({
  icon = "spark",
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon name={icon} size={26} />
      </div>

      <h2 className="mt-5 font-display text-[22px] font-bold text-ink">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-ink-2">
        {body}
      </p>

      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
