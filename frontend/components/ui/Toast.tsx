"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastTone = "default" | "error";

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [tone, setTone] = useState<ToastTone>("default");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback(
    (nextMessage: string, nextTone: ToastTone = "default") => {
      setMessage(nextMessage);
      setTone(nextTone);
      setVisible(true);

      if (timer.current) {
        clearTimeout(timer.current);
      }

      // The design system asks for 2.2 seconds, bottom centre.
      timer.current = setTimeout(() => setVisible(false), 2200);
    },
    []
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-1/2 z-50 max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-pill px-5 py-3 text-sm font-medium shadow-lg transition duration-menu ${
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        } ${tone === "error" ? "bg-danger text-white" : "bg-ink text-bg"}`}
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
