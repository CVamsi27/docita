import type { QueueItem } from "@workspace/data-access";
import { appClinicSchema } from "@workspace/types";
import {
  DEFAULT_SLOT_DURATION,
  formatUtcInstantAsClinicPickerIso,
  getPatientFullName,
} from "@workspace/utils";

/** Minimal appointment fields used by the doctor-now-next algorithm. */
export interface DashboardAppointment {
  id: string;
  status: string;
  startTime: string | Date;
  patientId?: string;
  patient?: { id?: string; firstName?: string; lastName?: string };
  type?: string;
  chiefComplaint?: string;
  invoice?: { id?: string; status?: string; total?: number } | null;
}

export type DoctorNextUpRow =
  | {
      kind: "appointment";
      appointmentId: string;
      patientId?: string;
      startTime: string;
      patientName: string;
      status: string;
      visitSummary?: string;
    }
  | {
      kind: "queue";
      appointmentId?: string;
      patientId?: string;
      tokenNumber: number;
      createdAt: string;
      patientName: string;
      status: string;
      tokenType: QueueItem["tokenType"];
      visitSummary?: string;
    };

export function isDateLocalToday(
  value: string | Date | null | undefined,
  clinicTz: string,
  today: string,
): boolean {
  if (!value) return true;
  const date =
    typeof value === "string"
      ? new Date(value)
      : value instanceof Date
        ? value
        : new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  return formatUtcInstantAsClinicPickerIso(date, clinicTz) === today;
}

export function buildQueueNextUpRow(
  q: QueueItem,
  visitSummary?: string,
): DoctorNextUpRow {
  const name = q.patient ? getPatientFullName(q.patient) : "Patient";
  return {
    kind: "queue",
    appointmentId: q.appointmentId,
    patientId: q.patient?.id ?? q.patientId,
    tokenNumber: q.tokenNumber,
    createdAt: q.createdAt,
    patientName: name,
    status: q.status,
    tokenType: q.tokenType,
    ...(visitSummary !== undefined ? { visitSummary } : {}),
  };
}

function readQueueAppointmentStartTime(q: QueueItem): string | null {
  const startTime = q.appointment?.startTime;
  return typeof startTime === "string" ? startTime : null;
}

export function isQueueItemForTodayFn(
  q: QueueItem,
  clinicTz: string,
  today: string,
): boolean {
  return (
    isDateLocalToday(readQueueAppointmentStartTime(q), clinicTz, today) ||
    isDateLocalToday(q.createdAt, clinicTz, today)
  );
}

/** Extracts `slotDuration` from clinic settings. */
export function getClinicSlotMinutes(clinic: unknown): number {
  const parsed = appClinicSchema.pick({ slotDuration: true }).safeParse(clinic);
  const value = parsed.success ? parsed.data.slotDuration : undefined;
  return typeof value === "number" ? value : DEFAULT_SLOT_DURATION;
}

// Re-exports from the per-concern modules so existing imports continue to work
export { buildDoctorNowNext } from "./consultation-doctor-now-next";
export type {
  BuildDoctorNowNextParams,
  DoctorNowNextResult,
} from "./consultation-doctor-now-next";
export { buildStats } from "./consultation-dashboard-stats";
export type { DashboardStats } from "./consultation-dashboard-stats";
export { sortAppointmentsByStartTime } from "./consultation-dashboard-stats";
export {
  buildActiveConsultations,
  buildWaitingList,
  buildOpdQueueRows,
} from "./consultation-dashboard-queue";
