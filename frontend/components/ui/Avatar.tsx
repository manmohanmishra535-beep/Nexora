import Image from "next/image";

import { cn } from "@/lib/cn";
import { initialsOf } from "@/lib/format";

type AvatarProps = {
  src?: string;
  name?: string;
  size?: 28 | 32 | 44 | 96;
  className?: string;
};

const dimensions = {
  28: { className: "h-7 w-7 text-[11px]", px: 28 },
  32: { className: "h-8 w-8 text-[12px]", px: 32 },
  44: { className: "h-11 w-11 text-[13px]", px: 44 },
  96: { className: "h-24 w-24 text-[30px]", px: 96 },
};

export default function Avatar({
  src,
  name,
  size = 44,
  className,
}: AvatarProps) {
  const dimension = dimensions[size];

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft font-display font-bold text-accent",
        dimension.className,
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name ? `${name}'s avatar` : "Avatar"}
          width={dimension.px}
          height={dimension.px}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
