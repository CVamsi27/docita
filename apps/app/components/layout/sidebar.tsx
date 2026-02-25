/**
 * Sidebar
 * Left navigation sidebar component
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  collapsible?: boolean;
}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, collapsible = true, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(
        "w-64 bg-muted/40 border-r border-border h-screen sticky top-0",
        collapsible && "transition-all duration-200",
        className,
      )}
      {...props}
    />
  ),
);
Sidebar.displayName = "Sidebar";

export type SidebarNavProps = React.HTMLAttributes<HTMLElement>;

const SidebarNav = React.forwardRef<HTMLElement, SidebarNavProps>(
  ({ className, ...props }, ref) => (
    <nav ref={ref} className={cn("p-4 space-y-2", className)} {...props} />
  ),
);
SidebarNav.displayName = "SidebarNav";

export interface SidebarNavItemProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

const SidebarNavItem = React.forwardRef<HTMLDivElement, SidebarNavItemProps>(
  ({ className, active = false, icon, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground/60 hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="flex-1">{children}</span>
    </div>
  ),
);
SidebarNavItem.displayName = "SidebarNavItem";

export { Sidebar, SidebarNav, SidebarNavItem };
