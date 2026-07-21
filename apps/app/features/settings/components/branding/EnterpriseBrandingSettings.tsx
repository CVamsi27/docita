"use client";

import { useState } from "react";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useUpdateClinicSettings } from "@workspace/data-access";
import { Feature } from "@workspace/types";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { toast } from "sonner";
import { BrandNameCard, LockedThemeCard, WhatsAppNumberCard } from "./EnterpriseBrandingSettingsSections";

export function EnterpriseBrandingSettings() {
  const { clinic, refreshClinic } = useClinic();
  const hasWhiteLabel = useTierFeatureEnabled(Feature.WHITE_LABEL_BRANDING);
  const hasLockedTheme = useTierFeatureEnabled(Feature.LOCKED_CUSTOM_THEME);
  const hasWhatsAppOwn = useTierFeatureEnabled(Feature.WHATSAPP_OWN_NUMBER);
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();

  const existing = clinic?.enterpriseBranding;

  const [brandName, setBrandName] = useState(existing?.brandName ?? "");
  const [primaryColor, setPrimaryColor] = useState(
    existing?.lockedTheme?.primaryColor ?? "blue",
  );
  const [mode, setMode] = useState<"light" | "dark" | "system">(
    existing?.lockedTheme?.mode ?? "system",
  );
  const [compactMode, setCompactMode] = useState(
    existing?.lockedTheme?.compactMode ?? false,
  );
  const [enforced, setEnforced] = useState(
    existing?.lockedTheme?.enforced ?? false,
  );

  const handleSaveBranding = () => {
    updateSettings(
      { brandName: brandName.trim() || undefined },
      {
        onSuccess: async () => {
          await refreshClinic();
          toast.success("Brand name updated");
        },
        onError: (error) =>
          showUserFacingErrorToast(
            error,
            "We could not save the brand name. Please try again.",
            "save",
          ),
      },
    );
  };

  const handleSaveTheme = () => {
    updateSettings(
      {
        lockedTheme: { primaryColor, mode, compactMode, enforced },
      },
      {
        onSuccess: async () => {
          await refreshClinic();
          toast.success("Theme settings saved");
        },
        onError: (error) =>
          showUserFacingErrorToast(
            error,
            "We could not save the theme settings. Please try again.",
            "save",
          ),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <BrandNameCard
        hasWhiteLabel={hasWhiteLabel}
        brandName={brandName}
        onBrandNameChange={setBrandName}
        isSaving={isSaving}
        onSave={handleSaveBranding}
      />
      <LockedThemeCard
        hasLockedTheme={hasLockedTheme}
        primaryColor={primaryColor}
        onPrimaryColorChange={setPrimaryColor}
        mode={mode}
        onModeChange={setMode}
        compactMode={compactMode}
        onCompactModeChange={setCompactMode}
        enforced={enforced}
        onEnforcedChange={setEnforced}
        isSaving={isSaving}
        onSave={handleSaveTheme}
      />
      <WhatsAppNumberCard hasWhatsAppOwn={hasWhatsAppOwn} />
    </div>
  );
}
