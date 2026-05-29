import type { ComponentType } from "react";
import { ClipboardList, Receipt, Stethoscope } from "lucide-react";

export const PATIENT_DETAIL_TAB_VALUES = [
  "visits",
  "records",
  "billing",
] as const;

export type PatientDetailTabValue = (typeof PATIENT_DETAIL_TAB_VALUES)[number];

export const PATIENT_RECORDS_SUB_TABS = [
  "history",
  "vitals",
  "prescriptions",
  "labs",
  "documents",
] as const;

export type PatientRecordsSubTab = (typeof PATIENT_RECORDS_SUB_TABS)[number];

export const LEGACY_PATIENT_TAB_REDIRECTS: Record<
  string,
  { tab: PatientDetailTabValue; subtab?: PatientRecordsSubTab }
> = {
  overview: { tab: "visits" },
  vitals: { tab: "records", subtab: "vitals" },
  prescriptions: { tab: "records", subtab: "prescriptions" },
  labs: { tab: "records", subtab: "labs" },
  documents: { tab: "records", subtab: "documents" },
};

export const TAB_DEFINITIONS: Array<{
  value: PatientDetailTabValue;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { value: "visits", label: "Visits", icon: Stethoscope },
  { value: "records", label: "Records", icon: ClipboardList },
  { value: "billing", label: "Billing", icon: Receipt },
];

export const RECORDS_SUB_TAB_LABELS: Record<PatientRecordsSubTab, string> = {
  history: "History & allergies",
  vitals: "Vitals",
  prescriptions: "Prescriptions",
  labs: "Labs",
  documents: "Documents",
};

export function isPatientDetailTabValue(
  value: string | null,
): value is PatientDetailTabValue {
  if (!value) return false;
  for (const tab of PATIENT_DETAIL_TAB_VALUES) {
    if (tab === value) return true;
  }
  return false;
}

export function isPatientRecordsSubTab(
  value: string | null,
): value is PatientRecordsSubTab {
  if (!value) return false;
  for (const subtab of PATIENT_RECORDS_SUB_TABS) {
    if (subtab === value) return true;
  }
  return false;
}
