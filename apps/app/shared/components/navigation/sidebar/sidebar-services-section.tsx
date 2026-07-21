"use client";

import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { AI_ASSISTANT_NAV_ITEM, type NavSection } from "@/components/navigation/nav-config";
import { SidebarLink } from "@/components/navigation/sidebar/sidebar-nav-link";

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
            <SidebarLink
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
          <SidebarLink
            item={AI_ASSISTANT_NAV_ITEM}
            collapsedRail={collapsedRail}
            showLabels={showLabels}
          />
        </div>
      ) : null}
    </>
  );
}
