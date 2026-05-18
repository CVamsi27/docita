
"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { useInternalTheme } from "@/components/internal-theme-provider";

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useInternalTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

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
          onClick={() => setTheme(nextTheme)}
          type="button"
        >
          <Icon className="h-4 w-4" />
        </Button>
      </SymbolTooltip>
    </span>
  );
}
