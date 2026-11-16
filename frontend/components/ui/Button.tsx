import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent hover:opacity-[.88] border-transparent",
  secondary:
    "border-line bg-transparent text-ink hover:bg-surface-2",
  ghost: "border-transparent bg-transparent text-accent hover:bg-accent-soft",
  danger: "border-danger bg-transparent text-danger hover:bg-surface-2",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-[18px] text-sm",
  sm: "h-8 px-3.5 text-[13px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  block = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-pill border font-semibold transition-[background-color,border-color,opacity,color] duration-hover disabled:cursor-not-allowed disabled:opacity-45",
        variants[variant],
        sizes[size],
        block && "w-full",
        className
      )}
      {...props}
    />
  );
}
