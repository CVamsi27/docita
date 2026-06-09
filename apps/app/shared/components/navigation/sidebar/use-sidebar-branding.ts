"use client";

import { Feature } from "@workspace/types";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";

/**
 * Resolves the white-label brand name to show in the sidebar header, or
 * `null` to fall back to the default Docita logo/icon. Extracted from
 * `SidebarContent` so the tier/branding lookup lives independent of the
 * header's render wiring.
 */
export function useSidebarBranding(): string | null {
  const { clinic } = useClinic();
  const hasWhiteLabel = useTierFeatureEnabled(Feature.WHITE_LABEL_BRANDING);

  return hasWhiteLabel && clinic?.enterpriseBranding?.brandName
    ? clinic.enterpriseBranding.brandName
    : null;
}
