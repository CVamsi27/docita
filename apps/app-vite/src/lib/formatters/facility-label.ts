import { useMemo } from "react";
import { useOptionalAppConfig } from "@/lib/contexts/app-config-context";
import { getFacilityLabel } from "@workspace/utils";

export function useFacilityLabel() {
  const appConfig = useOptionalAppConfig();

  return useMemo(() => {
    // check-as-cast-density: allow-file — clinic setting string narrowed to the facility-type union
    const label = appConfig?.getClinicSetting("facilityLabel") as "HOSPITAL" | "CLINIC" | undefined;
    return getFacilityLabel(label);
  }, [appConfig]);
}