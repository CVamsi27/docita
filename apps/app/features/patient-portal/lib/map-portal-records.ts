import { isRecord } from "@workspace/utils";
import type { PatientAppointmentStatus } from "@/features/patient-portal/types/patient-portal-types";

export function mapAppointmentStatus(status: unknown): PatientAppointmentStatus {
  if (typeof status !== "string") {
    return "PENDING";
  }

  const normalized = status.toUpperCase().replace("-", "_");
  if (normalized === "COMPLETED") {
    return "COMPLETED";
  }

  if (
    normalized === "CONFIRMED" ||
    normalized === "CHECKED_IN" ||
    normalized === "IN_PROGRESS"
  ) {
    return "CONFIRMED";
  }

  return "PENDING";
}

export function mapPortalAppointmentRow(
  item: Record<string, unknown>,
  index: number,
) {
  const doctor = isRecord(item.doctor) ? item.doctor : undefined;
  const clinic = isRecord(item.clinic) ? item.clinic : undefined;

  const doctorName =
    typeof item.doctorName === "string"
      ? item.doctorName
      : typeof doctor?.name === "string"
        ? doctor.name
        : "Doctor";

  const clinicName =
    typeof item.clinicName === "string"
      ? item.clinicName
      : typeof clinic?.name === "string"
        ? clinic.name
        : "Clinic";

  const scheduledAt =
    typeof item.scheduledAt === "string"
      ? item.scheduledAt
      : typeof item.startTime === "string"
        ? item.startTime
        : typeof item.appointmentDateTime === "string"
          ? item.appointmentDateTime
          : "";

  return {
    id: typeof item.id === "string" ? item.id : `appt-${index}`,
    doctorName,
    clinicName,
    scheduledAt,
    status: mapAppointmentStatus(item.status),
    reason: typeof item.reason === "string" ? item.reason : undefined,
    notes: typeof item.notes === "string" ? item.notes : undefined,
  };
}

export type PortalDoseStatus =
  | "TAKEN"
  | "MISSED"
  | "SKIPPED"
  | "PENDING"
  | "ADMINISTERED";

export function parsePortalDoseStatus(
  value: unknown,
): PortalDoseStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  if (
    normalized === "TAKEN" ||
    normalized === "MISSED" ||
    normalized === "SKIPPED" ||
    normalized === "PENDING" ||
    normalized === "ADMINISTERED"
  ) {
    return normalized;
  }
  return null;
}

export function mapPortalDoseRow(dose: Record<string, unknown>): {
  id: string;
  status: PortalDoseStatus;
  scheduledAt: string;
  medicationName?: string;
} {
  const medication = isRecord(dose.medication) ? dose.medication : undefined;
  return {
    id: typeof dose.id === "string" ? dose.id : "",
    status: parsePortalDoseStatus(dose.status) ?? "PENDING",
    scheduledAt: typeof dose.scheduledAt === "string" ? dose.scheduledAt : "",
    medicationName:
      typeof medication?.name === "string" ? medication.name : undefined,
  };
}
