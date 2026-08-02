import { useMemo } from "react";
import { useOptionalAppConfig } from "@/lib/contexts/app-config-context";
import { getFacilityLabel } from "@workspace/utils";

export function useFacilityLabel() {
  const appConfig = useOptionalAppConfig();

  return useMemo(() => {
    const label = appConfig?.getClinicSetting("facilityLabel") as "HOSPITAL" | "CLINIC" | undefined;
    return getFacilityLabel(label);
  }, [appConfig]);
}