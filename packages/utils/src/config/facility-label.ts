import type { FacilityTypeType } from "@workspace/types";

export type FacilityLabelValue = FacilityTypeType;

export function getFacilityLabel(value?: FacilityLabelValue | null) {
  return value === "HOSPITAL" ? "Hospital" : "Clinic";
}

export function getFacilityLabelLowercase(value?: FacilityLabelValue | null) {
  return getFacilityLabel(value).toLowerCase();
}
