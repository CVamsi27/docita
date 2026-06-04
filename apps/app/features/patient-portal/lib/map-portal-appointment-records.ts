import { isRecord } from "@workspace/utils";
import { mapAppointmentStatus } from "./map-portal-status";

export function mapPortalAppointmentRow(
  item: Record<string, unknown>,
  index: number,
) {
  const doctor = recordField(item.doctor);
  const clinic = recordField(item.clinic);
  return {
    id: stringField(item.id) ?? `appt-${index}`,
    doctorName:
      stringField(item.doctorName) ?? stringField(doctor?.name) ?? "Doctor",
    clinicName:
      stringField(item.clinicName) ?? stringField(clinic?.name) ?? "Clinic",
    scheduledAt:
      stringField(item.scheduledAt) ??
      stringField(item.startTime) ??
      stringField(item.appointmentDateTime) ??
      "",
    status: mapAppointmentStatus(item.status),
    reason: stringField(item.reason),
    notes: stringField(item.notes),
  };
}

function recordField(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
