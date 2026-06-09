"use client";

import { SidebarFooter } from "./sidebar/sidebar-footer";
import { useSidebarSections } from "./sidebar/use-sidebar-sections";
import { useSidebarBranding } from "./sidebar/use-sidebar-branding";
import {
  SidebarBrandHeader,
  SidebarScrollableNav,
} from "./sidebar/sidebar-content-sections";

// ─── SidebarContent ───────────────────────────────────────────────────────────

interface SidebarContentProps {
  isCollapsed: boolean;
  onExpand?: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export function SidebarContent({
  isCollapsed,
  onExpand,
  onClose,
  isMobile = false,
}: SidebarContentProps) {
  const {
    orderedVisibleSections,
    dynamicSection,
    aiAssistantAccessible,
    sectionsWithAccess,
    isAdmin,
    canAccessNotifications,
    canAccessSettings,
    canOpenBillingSettings,
    notificationCount,
    pendingJoinRequestCount,
    tierInfo,
    navOrder,
    isHidden,
    toggleItem,
  } = useSidebarSections();

  const collapsedRail = isCollapsed && !isMobile;
  const showLabels = !isCollapsed || isMobile;
  const brandName = useSidebarBranding();

  return (
    <>
      <SidebarBrandHeader
        collapsedRail={collapsedRail}
        isMobile={isMobile}
        brandName={brandName}
        onExpand={onExpand}
        onClose={onClose}
      />
      <SidebarScrollableNav
        layout={{ isCollapsed, collapsedRail, showLabels }}
        orderedVisibleSections={orderedVisibleSections}
        dynamicSection={dynamicSection}
        aiAssistantAccessible={aiAssistantAccessible}
      />
      <SidebarFooter
        collapsedRail={collapsedRail}
        showLabels={showLabels}
        isAdmin={isAdmin}
        canAccessNotifications={canAccessNotifications}
        canAccessSettings={canAccessSettings}
        canOpenBillingSettings={canOpenBillingSettings}
        notificationCount={notificationCount}
        pendingJoinRequestCount={pendingJoinRequestCount}
        tierInfo={tierInfo}
        sectionsWithAccess={sectionsWithAccess}
        isHidden={isHidden}
        toggleItem={toggleItem}
        navOrder={navOrder}
      />
    </>
  );
}
