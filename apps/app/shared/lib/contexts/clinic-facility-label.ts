import { facilityTypeSchema, type FacilityTypeType } from "@workspace/types";
import type { Clinic } from "./clinic-context-types";

export function getFacilityLabelFromSettings(
  value: Clinic["settings"],
): FacilityTypeType | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const facilityLabel = Object.fromEntries(Object.entries(value)).facilityLabel;
  const parsed = facilityTypeSchema.safeParse(facilityLabel);
  return parsed.success ? parsed.data : undefined;
}
