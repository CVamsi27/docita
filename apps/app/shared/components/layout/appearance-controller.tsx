"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useAppearanceStore } from "@/lib/stores/appearance-store";
import { useClinic } from "@/lib/contexts/clinic-context";
import { Feature } from "@workspace/types";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";

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
  const storeTheme = useAppearanceStore((s) => s.theme);
  const storePrimaryColor = useAppearanceStore((s) => s.primaryColor);
  const storeCompactMode = useAppearanceStore((s) => s.compactMode);
  const { theme: nextThemesPreference, setTheme } = useTheme();
  const setNextThemeRef = useRef(setTheme);
  setNextThemeRef.current = setTheme;
  const hydrated = useRef(false);
  const lastStoreTheme = useRef(storeTheme);

  const { clinic } = useClinic();
  const hasLockedTheme = useTierFeatureEnabled(Feature.LOCKED_CUSTOM_THEME);

  const lockedTheme =
    hasLockedTheme && clinic?.enterpriseBranding?.lockedTheme?.enforced
      ? clinic.enterpriseBranding.lockedTheme
      : null;

  const theme = lockedTheme?.mode ?? storeTheme;
  const primaryColor = lockedTheme?.primaryColor ?? storePrimaryColor;
  const compactMode = lockedTheme?.compactMode ?? storeCompactMode;

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
