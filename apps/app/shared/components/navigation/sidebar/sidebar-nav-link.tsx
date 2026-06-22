"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarNavItem } from "@workspace/ui/components/navigation/sidebar-nav-item";
import {
  sidebarNavLinkTestId,
  type NavItem,
} from "@/components/navigation/nav-config";

/** Stable anchors the guided welcome tour spotlights (see features/guided-tour). */
const TOUR_ID_BY_HREF: Record<string, string> = {
  "/patients": "nav-patients",
  "/appointments": "nav-appointments",
};

export function SidebarLink({
  item,
  collapsedRail,
  showLabels,
}: {
  item: NavItem;
  collapsedRail: boolean;
  showLabels: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <SidebarNavItem
      label={item.label}
      icon={item.icon}
      isActive={isActive}
      collapsedRail={collapsedRail}
      showLabels={showLabels}
      renderLink={({ className, children, "aria-label": ariaLabel }) => (
        <Link
          href={item.href}
          data-testid={sidebarNavLinkTestId(item.href)}
          data-tour-id={TOUR_ID_BY_HREF[item.href]}
          aria-label={ariaLabel}
          className={className}
        >
          {children}
        </Link>
      )}
    />
  );
}
