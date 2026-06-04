import type { PatientAppointmentStatus } from "@/features/patient-portal/types/patient-portal-types";

const appointmentStatusByInput: Record<string, PatientAppointmentStatus> = {
  COMPLETED: "COMPLETED",
  CONFIRMED: "CONFIRMED",
  CHECKED_IN: "CONFIRMED",
  IN_PROGRESS: "CONFIRMED",
};

export function mapAppointmentStatus(
  status: unknown,
): PatientAppointmentStatus {
  return typeof status === "string"
    ? (appointmentStatusByInput[status.toUpperCase().replace("-", "_")] ??
        "PENDING")
    : "PENDING";
}
