"use client";

import { Button, SymbolTooltip } from "@workspace/ui/components";
import { X } from "lucide-react";

interface ClearSearchButtonProps {
  onClear: () => void;
  className?: string;
}

export function ClearSearchButton({
  onClear,
  className,
}: ClearSearchButtonProps) {
  return (
    <div
      className={
        className ?? "absolute right-3 top-1/2 -translate-y-1/2"
      }
    >
      <SymbolTooltip label="Clear search">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClear}
          aria-label="Clear search"
        >
          <X className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Button>
      </SymbolTooltip>
    </div>
  );
}
