import { Moon, Sun } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { useMounted } from "@workspace/hooks";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { cn } from "@workspace/ui/lib/utils";

export interface ThemeToggleProps {
  /** Called after selecting light/dark so app state (e.g. persisted appearance) can stay in sync. */
  onSelectTheme?: (mode: "light" | "dark") => void;
  /** Read current resolved theme from an external store. */
  resolvedTheme?: string;
  /** Toggle callback managed by an external store. */
  onToggle?: () => void;
  className?: string;
}

export function ThemeToggle({
  onSelectTheme,
  resolvedTheme,
  onToggle,
  className,
}: ThemeToggleProps) {
  const mounted = useMounted();

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
            onToggle?.();
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
