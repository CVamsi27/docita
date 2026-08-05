import { useMemo } from "react";
import { useOptionalAppConfig } from "@/lib/contexts/app-config-context";
import { getFacilityLabel, parseStringEnumMember } from "@workspace/utils";
import { facilityTypeSchema } from "@workspace/types";

export function useFacilityLabel() {
  const appConfig = useOptionalAppConfig();

  return useMemo(() => {
    const rawSetting = appConfig?.getClinicSetting("facilityLabel");
    const label =
      typeof rawSetting === "string"
        ? parseStringEnumMember(facilityTypeSchema.options, rawSetting)
        : null;
    return getFacilityLabel(label ?? undefined);
  }, [appConfig]);
}