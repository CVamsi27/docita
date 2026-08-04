import { getPatientFullName } from "@workspace/utils";
import type { Patient, Prescription as PrescriptionEntity } from "@workspace/types";
import type { SortDirection, SortKey } from "@/features/prescriptions/components/list/PrescriptionsTableSections";

type Prescription = PrescriptionEntity & { patient: Patient };

export interface PrescriptionsSortConfig {
  key: SortKey;
  direction: SortDirection;
}

/**
 * Search filter shared by the prescriptions list — matches on patient name,
 * diagnosis, or medication names (case-insensitive substring match).
 */
export function filterPrescriptionsBySearch(
  prescriptions: Prescription[],
  query: string,
): Prescription[] {
  const q = query.trim().toLowerCase();
  if (!q) return prescriptions;
  return prescriptions.filter((p) => {
    const name = getPatientFullName(p.patient).toLowerCase();
    const dx = (p.diagnosis || "").toLowerCase();
    const meds = (p.medications || [])
      .map((m) => (m.name || "").toLowerCase())
      .join(" ");
    return name.includes(q) || dx.includes(q) || meds.includes(q);
  });
}

function compareSortValues(
  aValue: string | number,
  bValue: string | number,
  direction: SortDirection,
): number {
  if (aValue < bValue) return direction === "asc" ? -1 : 1;
  if (aValue > bValue) return direction === "asc" ? 1 : -1;
  return 0;
}

function sortValuesFor(
  prescription: Prescription,
  key: SortKey,
): string | number {
  switch (key) {
    case "date":
      return new Date(prescription.createdAt).getTime();
    case "patient":
      return getPatientFullName(prescription.patient).toLowerCase();
    case "diagnosis":
      return (prescription.diagnosis || "").toLowerCase();
    case "medications":
      return prescription.medications?.length || 0;
  }
}

/**
 * Sorts prescriptions by the active column/direction — extracted so the
 * comparison logic (and its `SortKey` switch) lives independently of the
 * `useMemo` wiring in `usePrescriptionsPageState`.
 */
export function sortPrescriptions(
  prescriptions: Prescription[],
  sortConfig: PrescriptionsSortConfig,
): Prescription[] {
  return [...prescriptions].sort((a, b) =>
    compareSortValues(
      sortValuesFor(a, sortConfig.key),
      sortValuesFor(b, sortConfig.key),
      sortConfig.direction,
    ),
  );
}

interface PrescriptionsHeaderDescriptionInput {
  hasDateRange: boolean;
  startDate: string;
  endDate: string;
  clinicToday: string;
  patientId: string;
  isDoctorRole: boolean;
}

function buildDateRangeLabel({
  hasDateRange,
  startDate,
  endDate,
  clinicToday,
}: Pick<
  PrescriptionsHeaderDescriptionInput,
  "hasDateRange" | "startDate" | "endDate" | "clinicToday"
>): string {
  if (!hasDateRange) return "all days";
  if (startDate === endDate) {
    return startDate === clinicToday
      ? `today (${clinicToday})`
      : `the day (${startDate})`;
  }
  return `${startDate} to ${endDate}`;
}

/**
 * Builds the page-header description sentence — varies by whether a patient
 * is selected and by the viewer's role (doctor vs. front-desk/admin).
 */
export function buildPrescriptionsHeaderDescription(
  input: PrescriptionsHeaderDescriptionInput,
): string {
  const dateLabel = buildDateRangeLabel(input);

  if (input.patientId.trim().length > 0) {
    return `Showing prescriptions for ${dateLabel}, scoped to the selected patient.`;
  }
  if (input.isDoctorRole) {
    return `Showing prescriptions for ${dateLabel}.`;
  }
  return `View and manage prescriptions for ${dateLabel}.`;
}
