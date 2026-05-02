"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useMounted } from "@workspace/hooks";
import {
  SymbolTooltip,
  TooltipProvider,
} from "@workspace/ui/components/tooltip";

export function ThemeToggle() {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="h-9 w-9" disabled />;
  }

  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? Moon : Sun;
  const nextTheme = isDark ? "light" : "dark";
  const switchLabel = `Switch to ${nextTheme} mode`;

  return (
    <TooltipProvider delayDuration={300}>
      <SymbolTooltip label={switchLabel} side="right">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label={switchLabel}
          onClick={() => setTheme(nextTheme)}
          type="button"
        >
          <Icon className="h-4 w-4" />
        </Button>
      </SymbolTooltip>
    </TooltipProvider>
  );
}
