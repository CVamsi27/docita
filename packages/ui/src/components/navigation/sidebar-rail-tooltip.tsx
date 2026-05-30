"use client";

import type { ReactElement, ReactNode } from "react";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";

export interface SidebarRailTooltipProps {
  label: ReactNode;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
}

/**
 * Tooltip for icon-only sidebar rail controls. Defaults to opening on the right
 * so labels stay clear of the collapsed sidebar edge.
 */
export function SidebarRailTooltip({
  label,
  children,
  side = "right",
  delayDuration,
}: SidebarRailTooltipProps) {
  return (
    <SymbolTooltip
      label={label}
      side={side}
      delayDuration={delayDuration}
    >
      {children}
    </SymbolTooltip>
  );
}
