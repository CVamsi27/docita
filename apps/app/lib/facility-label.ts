"use client";

import { useMemo } from "react";
import { useOptionalAppConfig } from "@/lib/app-config-context";

export function useFacilityLabel() {
  const appConfig = useOptionalAppConfig();

  return useMemo(() => {
    const label = appConfig?.getClinicSetting("facilityLabel");
    return label === "HOSPITAL" ? "Hospital" : "Clinic";
  }, [appConfig]);
}

