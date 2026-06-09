"use client";

import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import type { NavSection } from "@/components/navigation/nav-config";
import { SidebarLink } from "@/components/navigation/sidebar/sidebar-nav-link";

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
              <SidebarLink
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
