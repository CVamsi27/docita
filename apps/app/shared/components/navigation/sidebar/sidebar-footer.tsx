"use client";

import { useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { NotificationPanel } from "@/components/navigation/notification-panel";
import { type NavSection } from "@/components/navigation/nav-config";
import { useSidebarNavOrder } from "@/hooks/use-sidebar-nav-order";
import { SidebarCustomizeSheet } from "@/components/navigation/sidebar/sidebar-customize-sheet";
import {
  QuickAccessIcons,
  PlanRowSection,
  AskAiSection,
} from "./sidebar-footer-sections";

export interface SidebarFooterProps {
  collapsedRail: boolean;
  showLabels: boolean;
  isAdmin: boolean;
  canAccessNotifications: boolean;
  canAccessSettings: boolean;
  canOpenBillingSettings: boolean;
  notificationCount: number;
  pendingJoinRequestCount: number;
  tierInfo: { name: string; color?: string };
  sectionsWithAccess: NavSection[];
  isHidden: (href: string) => boolean;
  toggleItem: (href: string) => void;
  navOrder: ReturnType<typeof useSidebarNavOrder>;
}
export function SidebarFooter({
  collapsedRail,
  showLabels,
  isAdmin,
  canAccessNotifications,
  canAccessSettings,
  canOpenBillingSettings,
  notificationCount,
  pendingJoinRequestCount,
  tierInfo,
  sectionsWithAccess,
  isHidden,
  toggleItem,
  navOrder,
}: SidebarFooterProps) {
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  return (
    <div
      className={cn(
        "shrink-0 border-t",
        collapsedRail
          ? "border-border bg-muted/40 shadow-[inset_0_1px_0_0_hsl(var(--background))]"
          : "border-border/70",
      )}
    >
      <QuickAccessIcons
        collapsedRail={collapsedRail}
        isAdmin={isAdmin}
        canAccessNotifications={canAccessNotifications}
        canAccessSettings={canAccessSettings}
        pendingJoinRequestCount={pendingJoinRequestCount}
        notificationCount={notificationCount}
        onOpenNotifications={() => setNotificationPanelOpen(true)}
        onOpenCustomize={() => setCustomizeOpen(true)}
      />
      <PlanRowSection
        collapsedRail={collapsedRail}
        showLabels={showLabels}
        isAdmin={isAdmin}
        canOpenBillingSettings={canOpenBillingSettings}
        tierInfo={tierInfo}
      />
      <AskAiSection collapsedRail={collapsedRail} />
      {canAccessNotifications && (
        <NotificationPanel
          open={notificationPanelOpen}
          onOpenChange={setNotificationPanelOpen}
          enabled={canAccessNotifications}
        />
      )}
      <SidebarCustomizeSheet
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        sections={sectionsWithAccess}
        isHidden={isHidden}
        toggleItem={toggleItem}
        navOrder={navOrder}
      />
    </div>
  );
}
