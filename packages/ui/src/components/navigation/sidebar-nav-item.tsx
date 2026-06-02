"use client";

import type { ComponentType, ReactElement, ReactNode } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { SidebarRailTooltip } from "@workspace/ui/components/navigation/sidebar-rail-tooltip";

function getIconClasses(isActive: boolean) {
  return cn(
    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-transparent transition-colors",
    isActive
      ? "bg-foreground text-background ring-border/40"
      : "bg-background/60 text-muted-foreground ring-border/40",
  );
}

export interface SidebarNavItemProps {
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: boolean;
  collapsedRail: boolean;
  showLabels: boolean;
  className?: string;
  renderLink: (props: {
    className: string;
    children: ReactNode;
    "aria-label"?: string;
  }) => ReactElement;
}

export function SidebarNavItem({
  label,
  icon: Icon,
  isActive,
  collapsedRail,
  showLabels,
  className,
  renderLink,
}: SidebarNavItemProps) {
  const link = renderLink({
    className: cn(
      "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors duration-200",
      collapsedRail && "mx-auto w-11 max-w-[2.75rem] justify-center px-0",
      isActive
        ? collapsedRail
          ? // Collapsed: let the inner chip carry the fill so the left accent
            // bar reads as a distinct edge marker instead of blending into a
            // full-width foreground pill (which made it look cut off).
            "text-background"
          : "bg-foreground text-background shadow-sm"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      className,
    ),
    "aria-label": collapsedRail ? label : undefined,
    children: (
      <>
        {isActive ? (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-foreground transition-[height,width] duration-200",
              collapsedRail ? "h-7" : "h-5",
            )}
          />
        ) : null}
        <div className={getIconClasses(isActive)}>
          <Icon className="h-4 w-4 shrink-0" />
        </div>
        {showLabels ? (
          <span className="flex-1 truncate transition-opacity duration-200">
            {label}
          </span>
        ) : null}
      </>
    ),
  });

  if (collapsedRail) {
    return <SidebarRailTooltip label={label}>{link}</SidebarRailTooltip>;
  }

  return link;
}
