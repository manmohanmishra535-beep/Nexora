import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  id: string;
};

type InputProps = FieldProps & InputHTMLAttributes<HTMLInputElement>;

export function Field({ label, error, hint, id, ...props }: InputProps) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>

      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "h-11 w-full rounded-1 border bg-surface px-3 text-[15px] text-ink transition-colors duration-hover placeholder:text-ink-3 focus:border-accent focus:outline-2 focus:outline-accent",
          error ? "border-danger" : "border-line"
        )}
        {...props}
      />

      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-center gap-1.5 text-[13px] text-danger"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

type TextareaProps = FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextAreaField({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: TextareaProps) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>

      <textarea
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "w-full rounded-1 border bg-surface px-3 py-2.5 text-[15px] text-ink transition-colors duration-hover placeholder:text-ink-3 focus:border-accent focus:outline-2 focus:outline-accent",
          error ? "border-danger" : "border-line",
          className
        )}
        {...props}
      />

      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-center gap-1.5 text-[13px] text-danger"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}
