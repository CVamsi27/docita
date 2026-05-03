"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useAppearanceStore } from "@/lib/stores/appearance-store";

const ACCENT_VALUES = new Set([
  "blue",
  "green",
  "purple",
  "orange",
  "rose",
  "teal",
  "slate",
]);

export function AppearanceController() {
  const theme = useAppearanceStore((s) => s.theme);
  const primaryColor = useAppearanceStore((s) => s.primaryColor);
  const compactMode = useAppearanceStore((s) => s.compactMode);
  const { theme: nextThemesPreference, setTheme } = useTheme();
  const setNextThemeRef = useRef(setTheme);
  setNextThemeRef.current = setTheme;
  const hydrated = useRef(false);
  const lastStoreTheme = useRef(theme);

  useEffect(() => {
    if (nextThemesPreference === undefined) return;

    if (!hydrated.current) {
      hydrated.current = true;
      lastStoreTheme.current = theme;
      if (nextThemesPreference !== theme) {
        setNextThemeRef.current(theme);
      }
      return;
    }

    if (lastStoreTheme.current === theme) {
      return;
    }
    lastStoreTheme.current = theme;
    if (nextThemesPreference !== theme) {
      setNextThemeRef.current(theme);
    }
  }, [theme, nextThemesPreference]);

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
