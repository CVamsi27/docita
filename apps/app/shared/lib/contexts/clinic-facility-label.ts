import type { Clinic } from "./clinic-context-types";

export function getFacilityLabelFromSettings(
  value: Clinic["settings"],
): "CLINIC" | "HOSPITAL" | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const facilityLabel = Object.fromEntries(Object.entries(value)).facilityLabel;
  return facilityLabel === "CLINIC" || facilityLabel === "HOSPITAL"
    ? facilityLabel
    : undefined;
}
