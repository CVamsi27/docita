"use client";

import { useMemo } from "react";
import { useAppConfig } from "@/lib/app-config-context";

export function useFacilityLabel() {
  const { getClinicSetting } = useAppConfig();

  return useMemo(() => {
    const label = getClinicSetting("facilityLabel");
    return label === "HOSPITAL" ? "Hospital" : "Clinic";
  }, [getClinicSetting]);
}

