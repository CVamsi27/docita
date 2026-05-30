"use client";

import type { ReactElement, ReactNode } from "react";
import { SidebarRailTooltip } from "@workspace/ui/components/navigation/sidebar-rail-tooltip";

export interface SidebarRailActionProps {
  label: ReactNode;
  children: ReactElement;
  showTooltip?: boolean;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Wraps an icon-only sidebar footer/control with a hover tooltip when labels
 * are hidden in the collapsed rail.
 */
export function SidebarRailAction({
  label,
  children,
  showTooltip = true,
  side = "right",
}: SidebarRailActionProps) {
  if (!showTooltip) {
    return children;
  }

  return (
    <SidebarRailTooltip label={label} side={side}>
      {children}
    </SidebarRailTooltip>
  );
}
