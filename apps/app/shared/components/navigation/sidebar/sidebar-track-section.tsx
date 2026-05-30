"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { SidebarNavItem } from "@workspace/ui/components/navigation/sidebar-nav-item";
import {
  sidebarNavLinkTestId,
  type NavItem,
  type NavSection,
} from "@/components/navigation/nav-config";

interface SidebarTrackSectionProps {
  orderedVisibleSections: NavSection[];
  collapsedRail: boolean;
  showLabels: boolean;
}

export function SidebarTrackSection({
  orderedVisibleSections,
  collapsedRail,
  showLabels,
}: SidebarTrackSectionProps) {
  return (
    <>
      {orderedVisibleSections.map((section) => {
        if (section.items.length === 0) return null;
        return (
          <div key={section.id} className="space-y-0.5">
            {showLabels ? (
              <MicroLabel className="px-2.5 pb-1.5 pt-1">
                {section.label}
              </MicroLabel>
            ) : (
              <div
                aria-hidden
                className="mx-auto my-1 h-px w-6 rounded-full bg-border/70"
              />
            )}
            {section.items.map((item) => (
              <SidebarTrackNavLink
                key={item.href}
                item={item}
                collapsedRail={collapsedRail}
                showLabels={showLabels}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

function SidebarTrackNavLink({
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
          aria-label={ariaLabel}
          className={className}
        >
          {children}
        </Link>
      )}
    />
  );
}
