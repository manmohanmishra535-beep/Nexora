"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = "nexora-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyMode(mode: ThemeMode) {
  const root = document.documentElement;

  if (mode === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", mode);
  }
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored === "light" || stored === "dark") {
        // The inline boot script already applied the stored theme to the
        // document; this only syncs the React context after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setModeState(stored);
        applyMode(stored);
      }
    } catch {
      // Storage can be blocked; system theme still works.
    }
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyMode(next);

    try {
      if (next === "system") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Ignore storage failures.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }

  return context;
}
