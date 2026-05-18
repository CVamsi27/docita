"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type InternalTheme = "light" | "dark";

interface InternalThemeContextValue {
  resolvedTheme: InternalTheme;
  setTheme: (theme: InternalTheme) => void;
}

const STORAGE_KEY = "theme";
const THEMES: InternalTheme[] = ["light", "dark"];
const DEFAULT_THEME: InternalTheme = "light";

const InternalThemeContext = createContext<InternalThemeContextValue | null>(
  null,
);

function isInternalTheme(value: string | null): value is InternalTheme {
  return value === "light" || value === "dark";
}

function getStoredTheme(): InternalTheme {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    return isInternalTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(theme: InternalTheme) {
  const root = document.documentElement;
  root.classList.remove(...THEMES);
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

export function InternalThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<InternalTheme>(DEFAULT_THEME);

  useEffect(() => {
    const storedTheme = getStoredTheme();
    setThemeState(storedTheme);
    applyTheme(storedTheme);
  }, []);

  const setTheme = useCallback((nextTheme: InternalTheme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);

    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Persisting the theme is optional; the DOM update above is the source of truth.
    }
  }, []);

  const value = useMemo(
    () => ({
      resolvedTheme: theme,
      setTheme,
    }),
    [setTheme, theme],
  );

  return (
    <InternalThemeContext.Provider value={value}>
      {children}
    </InternalThemeContext.Provider>
  );
}

export function useInternalTheme() {
  const context = useContext(InternalThemeContext);

  if (!context) {
    throw new Error("useInternalTheme must be used within InternalThemeProvider");
  }

  return context;
}
