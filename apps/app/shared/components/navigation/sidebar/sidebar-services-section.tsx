"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { SidebarNavItem } from "@workspace/ui/components/navigation/sidebar-nav-item";
import {
  AI_ASSISTANT_NAV_ITEM,
  type NavItem,
  type NavSection,
  sidebarNavLinkTestId,
} from "@/components/navigation/nav-config";

interface SidebarServicesSectionProps {
  dynamicSection: NavSection | null;
  aiAssistantAccessible: boolean;
  collapsedRail: boolean;
  showLabels: boolean;
}

export function SidebarServicesSection({
  dynamicSection,
  aiAssistantAccessible,
  collapsedRail,
  showLabels,
}: SidebarServicesSectionProps) {
  return (
    <>
      {dynamicSection && dynamicSection.items.length > 0 ? (
        <div className="space-y-0.5">
          {showLabels ? (
            <MicroLabel className="px-2.5 pb-1.5 pt-1">
              {dynamicSection.label}
            </MicroLabel>
          ) : (
            <div
              aria-hidden
              className="mx-auto my-1 h-px w-6 rounded-full bg-border/70"
            />
          )}
          {dynamicSection.items.map((item) => (
            <ServiceNavLink
              key={item.href}
              item={item}
              collapsedRail={collapsedRail}
              showLabels={showLabels}
            />
          ))}
        </div>
      ) : null}

      {aiAssistantAccessible ? (
        <div className="space-y-0.5">
          {showLabels ? (
            <MicroLabel className="px-2.5 pb-1.5 pt-1">Assistant</MicroLabel>
          ) : (
            <div
              aria-hidden
              className="mx-auto my-1 h-px w-6 rounded-full bg-border/70"
            />
          )}
          <ServiceNavLink
            item={AI_ASSISTANT_NAV_ITEM}
            collapsedRail={collapsedRail}
            showLabels={showLabels}
          />
        </div>
      ) : null}
    </>
  );
}

function ServiceNavLink({
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
