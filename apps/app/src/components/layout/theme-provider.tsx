import { useEffect } from "react";
import { useAppearanceStore } from "@/lib/stores/appearance-store";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeToDOM(
  theme: "light" | "dark" | "system",
  primaryColor: string,
  compactMode: boolean,
) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-accent", primaryColor);
  root.setAttribute("data-density", compactMode ? "compact" : "comfortable");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppearanceStore((s) => s.theme);
  const primaryColor = useAppearanceStore((s) => s.primaryColor);
  const compactMode = useAppearanceStore((s) => s.compactMode);

  useEffect(() => {
    applyThemeToDOM(theme, primaryColor, compactMode);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyThemeToDOM("system", primaryColor, compactMode);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme, primaryColor, compactMode]);

  return <>{children}</>;
}
