export type FacilityLabelValue = "CLINIC" | "HOSPITAL";

export function getFacilityLabel(value?: FacilityLabelValue | null) {
  return value === "HOSPITAL" ? "Hospital" : "Clinic";
}

export function getFacilityLabelLowercase(value?: FacilityLabelValue | null) {
  return getFacilityLabel(value).toLowerCase();
}
