"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useAppearanceStore } from "@/lib/stores/appearance-store";

const ACCENT_VALUES = new Set(["blue", "green", "purple", "orange"]);

export function AppearanceController() {
  const { theme, primaryColor, compactMode } = useAppearanceStore();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (compactMode) {
      root.dataset.density = "compact";
    } else {
      delete root.dataset.density;
    }
  }, [compactMode]);

  useEffect(() => {
    const root = document.documentElement;
    if (
      primaryColor &&
      ACCENT_VALUES.has(primaryColor) &&
      primaryColor !== "blue"
    ) {
      root.dataset.accent = primaryColor;
    } else {
      delete root.dataset.accent;
    }
  }, [primaryColor]);

  return null;
}
