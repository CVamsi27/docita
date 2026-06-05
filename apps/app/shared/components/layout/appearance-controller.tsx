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

type AppearanceTheme = "system" | "light" | "dark";

export interface AppearanceOverride {
  mode?: string | null;
  primaryColor?: string | null;
  compactMode?: boolean | null;
}

function resolveThemeMode(
  overrideMode: string | null | undefined,
  fallback: AppearanceTheme,
) {
  return overrideMode === "system" ||
    overrideMode === "light" ||
    overrideMode === "dark"
    ? overrideMode
    : fallback;
}

export function AppearanceController({
  override,
  locked = false,
}: {
  override?: AppearanceOverride | null;
  locked?: boolean;
}) {
  const storeTheme = useAppearanceStore((s) => s.theme);
  const storePrimaryColor = useAppearanceStore((s) => s.primaryColor);
  const storeCompactMode = useAppearanceStore((s) => s.compactMode);
  const { theme: nextThemesPreference, setTheme } = useTheme();
  const setNextThemeRef = useRef(setTheme);
  setNextThemeRef.current = setTheme;
  const hydrated = useRef(false);
  const lastStoreTheme = useRef(storeTheme);

  const theme = resolveThemeMode(override?.mode, storeTheme);
  const primaryColor = override?.primaryColor ?? storePrimaryColor;
  const compactMode = override?.compactMode ?? storeCompactMode;

  useEffect(() => {
    const root = document.documentElement;
    if (locked) {
      root.dataset.appearanceLocked = "true";
      return () => {
        delete root.dataset.appearanceLocked;
      };
    }
    return undefined;
  }, [locked]);

  useEffect(() => {
    if (nextThemesPreference === undefined) return;
    if (
      !locked &&
      document.documentElement.dataset.appearanceLocked === "true"
    ) {
      return;
    }

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
  }, [locked, theme, nextThemesPreference]);

  useEffect(() => {
    const root = document.documentElement;
    if (!locked && root.dataset.appearanceLocked === "true") {
      return;
    }
    if (compactMode) {
      root.dataset.density = "compact";
    } else {
      delete root.dataset.density;
    }
  }, [compactMode, locked]);

  useEffect(() => {
    const root = document.documentElement;
    if (!locked && root.dataset.appearanceLocked === "true") {
      return;
    }
    if (
      primaryColor &&
      ACCENT_VALUES.has(primaryColor) &&
      primaryColor !== "blue"
    ) {
      root.dataset.accent = primaryColor;
    } else {
      delete root.dataset.accent;
    }
  }, [primaryColor, locked]);

  return null;
}
