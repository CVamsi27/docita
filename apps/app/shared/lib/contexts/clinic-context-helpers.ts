import { logger } from "@/lib/monitoring/logger";
import type { AppClinic } from "@workspace/types";

export type Clinic = AppClinic;

export function getStoredClinicId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const savedClinicId = localStorage.getItem("selectedClinicId");
    localStorage.removeItem("selectedClinic");
    return savedClinicId && savedClinicId.length > 0 ? savedClinicId : null;
  } catch (error) {
    logger.warn("Failed to read selected clinic from localStorage", { error });
  }
  return null;
}

export function subscribeToWindowFocus(callback: () => void) {
  const handleFocus = () => callback();
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      callback();
    }
  };

  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

export function toBooleanFeatureOverrides(
  value: Clinic["features"],
): Record<string, boolean> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
    ),
  );
}

export function getFacilityLabelFromSettings(
  value: Clinic["settings"],
): "CLINIC" | "HOSPITAL" | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const facilityLabel = Object.fromEntries(Object.entries(value)).facilityLabel;
  return facilityLabel === "CLINIC" || facilityLabel === "HOSPITAL"
    ? facilityLabel
    : undefined;
}
