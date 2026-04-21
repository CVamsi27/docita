"use client";

import { useMemo } from "react";
import { useOptionalAppConfig } from "@/lib/app-config-context";
import { getFacilityLabel } from "@workspace/utils";

export function useFacilityLabel() {
  const appConfig = useOptionalAppConfig();

  return useMemo(() => {
    const label = appConfig?.getClinicSetting("facilityLabel");
    return getFacilityLabel(label);
  }, [appConfig]);
}
