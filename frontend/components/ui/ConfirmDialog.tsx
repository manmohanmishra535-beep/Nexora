"use client";

import { useEffect, useId, useRef } from "react";

import Button from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Shared confirmation dialog for destructive actions. Escape and backdrop
 * clicks cancel it, Tab is trapped inside, and the page behind it stops
 * scrolling while it is open.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  busy = false,
  busyLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(onCancel);

  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFirstControl = () => {
      const first = dialogRef.current?.querySelector<HTMLElement>(
        "button, [href], input, select, textarea"
      );
      first?.focus();
    };

    const timer = window.setTimeout(focusFirstControl, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!busy) {
          event.preventDefault();
          cancelRef.current();
        }
        return;
      }

      if (event.key !== "Tab") return;

      const container = dialogRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!container.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, [open, busy]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-[400px] rounded-3 border border-line bg-surface p-5 shadow-xl"
      >
        <h2
          id={titleId}
          className="font-display text-[18px] font-bold text-ink"
        >
          {title}
        </h2>

        <p
          id={descriptionId}
          className="mt-2 text-[14px] leading-6 text-ink-2"
        >
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={busy}
            autoFocus
          >
            {cancelLabel}
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && busyLabel ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
