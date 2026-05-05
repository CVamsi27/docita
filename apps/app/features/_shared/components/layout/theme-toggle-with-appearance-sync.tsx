"use client";

import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { useAppearanceStore } from "@/lib/stores/appearance-store";

export function ThemeToggleWithAppearanceSync() {
  const setAppearanceTheme = useAppearanceStore((s) => s.setTheme);

  return (
    <ThemeToggle
      onSelectTheme={(mode) => {
        setAppearanceTheme(mode);
      }}
    />
  );
}
