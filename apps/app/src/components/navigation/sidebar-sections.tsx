import { useMemo } from "react";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import type { NavSection } from "@/components/navigation/nav-config";
import { SidebarLink } from "@/components/navigation/sidebar-nav-link";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { useEffectivePermissions } from "@/lib/access-control/use-effective-permissions";
import { parseUserRole } from "@/lib/access-control/parse-user-role";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissionStore } from "@/lib/stores/permission-store";

interface SidebarTrackSectionProps {
  sections: NavSection[];
  collapsedRail: boolean;
  showLabels: boolean;
}

export function SidebarTrackSection({
  sections,
  collapsedRail,
  showLabels,
}: SidebarTrackSectionProps) {
  const { user } = useAuth();
  const canAccessFeature = usePermissionStore((s) => s.canAccess);
  const currentTier = usePermissionStore((s) => s.currentTier);
  const hasIntelligence = usePermissionStore((s) => s.hasIntelligence);
  const snapshot = useEffectivePermissions()?.targets;

  // Permission-filtered nav: same contract as the page-level tab filtering
  // (InboxPageContent) — a feature or accessTarget gate that denies hides the
  // link, so front-desk clinics never see clinical surfaces like
  // Consultation.
  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            if (item.feature && !canAccessFeature(item.feature)) {
              return false;
            }
            if (item.accessTarget) {
              return canAccessTarget(
                item.accessTarget,
                {
                  role: user?.role ? parseUserRole(user.role) : undefined,
                  canAccessFeature,
                  currentTier,
                  hasIntelligence,
                  snapshot,
                },
                "read",
              );
            }
            return true;
          }),
        }))
        .filter((section) => section.items.length > 0),
    [sections, user?.role, canAccessFeature, currentTier, hasIntelligence, snapshot],
  );

  return (
    <>
      {visibleSections.map((section) => (
        <div key={section.id} className="space-y-0.5">
          {showLabels ? (
            <MicroLabel className="px-2.5 pb-1.5 pt-1">
              {section.label}
            </MicroLabel>
          ) : (
            <div aria-hidden className="mx-auto my-1 h-px w-6 rounded-full bg-border/70" />
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
      ))}
    </>
  );
}
