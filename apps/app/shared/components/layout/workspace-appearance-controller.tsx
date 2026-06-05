"use client";

import { Feature } from "@workspace/types/billing";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
import { useOptionalClinic } from "@/lib/contexts/clinic-context";
import { AppearanceController } from "@/components/layout/appearance-controller";

export function WorkspaceAppearanceController() {
  const clinic = useOptionalClinic()?.clinic;
  const hasLockedTheme = useTierFeatureEnabled(Feature.LOCKED_CUSTOM_THEME);
  const lockedTheme =
    hasLockedTheme && clinic?.enterpriseBranding?.lockedTheme?.enforced
      ? clinic.enterpriseBranding.lockedTheme
      : null;

  if (!lockedTheme) {
    return null;
  }

  return <AppearanceController override={lockedTheme} locked />;
}
