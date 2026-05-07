"use client";

import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { useAppearanceStore } from "@/lib/stores/appearance-store";

export function ThemeToggleWithAppearanceSync({
  className,
}: {
  className?: string;
}) {
  const setAppearanceTheme = useAppearanceStore((s) => s.setTheme);

  return (
    <ThemeToggle
      className={className}
      onSelectTheme={(mode) => {
        setAppearanceTheme(mode);
      }}
    />
  );
}
