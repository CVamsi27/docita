"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { useAppearanceStore } from "@/lib/stores/appearance-store";

export function ThemeToggleWithAppearanceSync() {
  const { theme } = useTheme();
  const setAppearanceTheme = useAppearanceStore((s) => s.setTheme);
  const prev = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!theme) return;
    if (prev.current === theme) return;
    prev.current = theme;
    if (theme === "light" || theme === "dark" || theme === "system") {
      setAppearanceTheme(theme);
    }
  }, [theme, setAppearanceTheme]);

  return <ThemeToggle />;
}
