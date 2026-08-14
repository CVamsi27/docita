import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ThemeContext, type Theme } from "./theme-context";

/**
 * Persisted appearance key for the internal app. The legacy `docita-theme`
 * key was written by the pre-cutover Next.js app; read it once as the initial
 * value so existing dark-mode users keep their preference, then migrate to
 * `docita-internal-theme` on the first change.
 */
const THEME_STORAGE_KEY = "docita-internal-theme";
const LEGACY_THEME_STORAGE_KEY = "docita-theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacy === "light" || legacy === "dark") {
      return legacy;
    }
  } catch {
    // localStorage unavailable (e.g. strict privacy mode) — fall through to system
  }
  return "system";
}

function applyThemeToDOM(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.setAttribute("data-theme", resolved);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const update = () => {
      setSystemTheme(getSystemTheme());
      applyThemeToDOM(theme);
    };
    update();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // non-fatal: appearance just won't persist
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const resolvedTheme: "light" | "dark" =
    theme === "system" ? systemTheme : theme;

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
