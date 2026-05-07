"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useMounted } from "@workspace/hooks";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

export interface ThemeToggleProps {
  /** Called after selecting light/dark so app state (e.g. persisted appearance) can stay in sync. */
  onSelectTheme?: (mode: "light" | "dark") => void;
  className?: string;
}

export function ThemeToggle({ onSelectTheme, className }: ThemeToggleProps) {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <span
        className={cn(
          "inline-grid size-9 shrink-0 place-items-center leading-none",
          className,
        )}
      >
        <Button variant="ghost" size="icon-sm" className="size-9 shrink-0" disabled />
      </span>
    );
  }

  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? Moon : Sun;
  const nextTheme = isDark ? "light" : "dark";
  const switchLabel = `Switch to ${nextTheme} mode`;

  return (
    <span
      className={cn(
        "inline-grid size-9 shrink-0 place-items-center leading-none",
        className,
      )}
    >
      <SymbolTooltip label={switchLabel} side="right">
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-9 shrink-0 rounded-lg"
          aria-label={switchLabel}
          onClick={() => {
            setTheme(nextTheme);
            onSelectTheme?.(nextTheme);
          }}
          type="button"
        >
          <Icon className="h-4 w-4" />
        </Button>
      </SymbolTooltip>
    </span>
  );
}
