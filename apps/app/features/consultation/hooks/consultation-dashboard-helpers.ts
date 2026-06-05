import type { QueueItem } from "@workspace/data-access";
import { appClinicSchema, type AppointmentListItemContractResponse } from "@workspace/types";
import {
  DEFAULT_SLOT_DURATION,
  formatUtcInstantAsClinicPickerIso,
  getPatientFullName,
} from "@workspace/utils";
import {
  isQueueTokenCompleted,
  isQueueTokenInProgress,
  isQueueTokenWaiting,
} from "@/lib/utils/queue-token-status";

/** Minimal appointment fields used by the doctor-now-next algorithm. */
export interface DashboardAppointment {
  id: string;
  status: string;
  startTime: string | Date;
  patientId?: string;
  patient?: { id?: string; firstName?: string; lastName?: string };
  type?: string;
  chiefComplaint?: string;
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

interface BuildDoctorNowNextParams {
  inProgressItems: DashboardAppointment[];
  todayAppointmentsSorted: DashboardAppointment[];
  todayQueueRows: QueueItem[];
  slotMinutes: number;
  isLocalToday: (value: string | Date | null | undefined) => boolean;
}

export interface DoctorNowNextResult {
  inProgress: DashboardAppointment[];
  combinedUpcoming: DoctorNextUpRow[];
  mode: "fcfs" | "schedule";
}

/**
 * Builds the "Doctor up next" list for the consultation dashboard. When the
 * doctor has no schedule today, falls back to FCFS (queue order). Otherwise,
 * interleaves scheduled appointments with walk-ins, dropping a walk-in into
 * each `slotMinutes` gap between consecutive appointments. Pure function;
 * unit-testable without React.
 */
export function buildDoctorNowNext({
  inProgressItems,
  todayAppointmentsSorted,
  todayQueueRows,
  slotMinutes,
  isLocalToday,
}: BuildDoctorNowNextParams): DoctorNowNextResult {
  const inProgress = inProgressItems.filter(
    (a) => a.status === "in-progress" && isLocalToday(a.startTime),
  );
  const nextScheduled = todayAppointmentsSorted.filter((a) =>
    ["scheduled", "confirmed", "checked-in"].includes(a.status),
  );

  const walkInQueue = todayQueueRows.filter(
    (q) => q.tokenType !== "scheduled" && isQueueTokenWaiting(q.status),
  );
  const walkInSorted = [...walkInQueue].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (ta !== tb) return ta - tb;
    return (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0);
  });

  const slotMs = Math.max(5, slotMinutes) * 60 * 1000;
  const combinedUpcoming: DoctorNextUpRow[] = [];

  // If there is no schedule today, fall back to FCFS (queue order).
  if (todayAppointmentsSorted.length === 0) {
    for (const q of todayQueueRows) {
      const name = q.patient ? getPatientFullName(q.patient) : "Patient";
      combinedUpcoming.push({
        kind: "queue",
        appointmentId: q.appointmentId,
        patientId: q.patient?.id ?? q.patientId,
        tokenNumber: q.tokenNumber,
        createdAt: q.createdAt,
        patientName: name,
        status: q.status,
        tokenType: q.tokenType,
      });
    }
    return { inProgress, combinedUpcoming, mode: "fcfs" };
  }

  // Otherwise: schedule in time order, fill gaps with walk-ins (FCFS).
  const appts = nextScheduled;
  let walkInIdx = 0;

  for (let i = 0; i < appts.length; i++) {
    const apt = appts[i];
    const aptName = apt.patient ? getPatientFullName(apt.patient) : "Patient";
    const visitSummary =
      apt.chiefComplaint?.trim() || apt.type?.trim() || undefined;
    combinedUpcoming.push({
      kind: "appointment",
      appointmentId: apt.id,
      patientId: apt.patientId ?? apt.patient?.id,
      startTime:
        typeof apt.startTime === "string"
          ? apt.startTime
          : apt.startTime.toISOString(),
      patientName: aptName,
      status: apt.status,
      visitSummary,
    });

    const next = appts[i + 1];
    if (!next) continue;
    const gapMs =
      new Date(next.startTime).getTime() - new Date(apt.startTime).getTime();
    const gapSlots = Math.max(0, Math.floor(gapMs / slotMs) - 1);
    for (let s = 0; s < gapSlots && walkInIdx < walkInSorted.length; s++) {
      const q = walkInSorted[walkInIdx++];
      const name = q.patient ? getPatientFullName(q.patient) : "Patient";
      combinedUpcoming.push({
        kind: "queue",
        appointmentId: q.appointmentId,
        patientId: q.patient?.id ?? q.patientId,
        tokenNumber: q.tokenNumber,
        createdAt: q.createdAt,
        patientName: name,
        status: q.status,
        tokenType: q.tokenType,
        visitSummary:
          q.appointment?.chiefComplaint?.trim() ||
          q.appointment?.type?.trim() ||
          undefined,
      });
    }
  }

  while (walkInIdx < walkInSorted.length) {
    const q = walkInSorted[walkInIdx++];
    const name = q.patient ? getPatientFullName(q.patient) : "Patient";
    combinedUpcoming.push({
      kind: "queue",
      appointmentId: q.appointmentId,
      patientId: q.patient?.id ?? q.patientId,
      tokenNumber: q.tokenNumber,
      createdAt: q.createdAt,
      patientName: name,
      status: q.status,
      tokenType: q.tokenType,
      visitSummary:
        q.appointment?.chiefComplaint?.trim() ||
        q.appointment?.type?.trim() ||
        undefined,
    });
  }

  return { inProgress, combinedUpcoming, mode: "schedule" };
}

/* ------------------------------------------------------------------ */
/* Dashboard stats, sort, and queue-view extraction                   */
/* ------------------------------------------------------------------ */

export interface DashboardStats {
  scheduledToday: number;
  waiting: number;
  inProgress: number;
  completed: number;
}

export function buildStats(
  todayAppointments: AppointmentListItemContractResponse[],
  inProgressAppointments: AppointmentListItemContractResponse[],
  todayQueue: QueueItem[],
): DashboardStats {
  const appointmentIdsWithQueueToken = new Set(
    todayQueue
      .map((q) => q.appointmentId)
      .filter((id): id is string => Boolean(id)),
  );
  const inProgressFromQueue = todayQueue.filter((q) =>
    isQueueTokenInProgress(q.status),
  ).length;
  const inProgressAppointmentsOnly = inProgressAppointments.filter(
    (a) =>
      a.status === "in-progress" &&
      a.id &&
      !appointmentIdsWithQueueToken.has(a.id),
  ).length;

  return {
    scheduledToday: todayAppointments.length,
    waiting: todayQueue.filter((q) => isQueueTokenWaiting(q.status)).length,
    inProgress: inProgressFromQueue + inProgressAppointmentsOnly,
    completed: todayQueue.filter((q) => isQueueTokenCompleted(q.status)).length,
  };
}

export function sortAppointmentsByStartTime(
  items: AppointmentListItemContractResponse[],
): AppointmentListItemContractResponse[] {
  return [...items].sort((a, b) => {
    const ta = new Date(a.startTime).getTime();
    const tb = new Date(b.startTime).getTime();
    return ta - tb;
  });
}

export function buildActiveConsultations(
  todayQueue: QueueItem[],
  inProgressAppointments: AppointmentListItemContractResponse[],
  isLocalToday: (value: string | Date | null | undefined) => boolean,
): QueueItem[] {
  const fromQueue = todayQueue.filter((q) => isQueueTokenInProgress(q.status));
  const coveredAppointmentIds = new Set(
    fromQueue
      .map((q) => q.appointmentId)
      .filter((id): id is string => Boolean(id)),
  );
  const withoutQueueToken: QueueItem[] = [];

  for (const a of inProgressAppointments) {
    if (
      a.status !== "in-progress" ||
      !a.id ||
      coveredAppointmentIds.has(a.id) ||
      !isLocalToday(a.startTime)
    ) {
      continue;
    }

    const updatedAt =
      typeof a.updatedAt === "string"
        ? a.updatedAt
        : new Date(a.updatedAt).toISOString();

    withoutQueueToken.push({
      id: `in-progress-appt-${a.id}`,
      clinicId: a.clinicId,
      patientId: a.patientId,
      appointmentId: a.id,
      doctorId: a.doctorId,
      tokenNumber: 0,
      status: "IN_PROGRESS",
      priority: 0,
      createdAt: updatedAt,
      tokenType: "scheduled",
      estimatedDuration: 30,
      estimatedWaitTime: 0,
      patient: a.patient
        ? {
            id: a.patient.id ?? a.patientId,
            firstName: a.patient.firstName,
            lastName: a.patient.lastName,
            phoneNumber: a.patient.phoneNumber ?? "",
          }
        : undefined,
      appointment: a.id
        ? {
            id: a.id,
            doctor: {
              id: a.doctor?.id ?? "",
              name: a.doctor?.name ?? "",
            },
            type: a.type ?? null,
            chiefComplaint: a.chiefComplaint ?? null,
          }
        : undefined,
    });
  }

  return [...fromQueue, ...withoutQueueToken];
}

export function buildWaitingList(todayQueue: QueueItem[]): QueueItem[] {
  return todayQueue.filter((q) => isQueueTokenWaiting(q.status));
}

export function buildOpdQueueRows(
  activeConsultations: QueueItem[],
  waitingList: QueueItem[],
): QueueItem[] {
  const byId = new Map<string, QueueItem>();
  for (const q of activeConsultations) {
    byId.set(q.id, q);
  }
  for (const q of waitingList) {
    byId.set(q.id, q);
  }
  const patientKey = (q: QueueItem) =>
    `${q.patient?.lastName ?? ""}\u0000${q.patient?.firstName ?? ""}`;
  const rank = (q: QueueItem): number => {
    if (isQueueTokenInProgress(q.status)) return 0;
    if (isQueueTokenWaiting(q.status)) return 1;
    return 2;
  };
  const tokenSort = (q: QueueItem) =>
    q.tokenNumber > 0 ? q.tokenNumber : 10_000;
  return Array.from(byId.values()).sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const ta = tokenSort(a);
    const tb = tokenSort(b);
    if (ta !== tb) return ta - tb;
    return patientKey(a).localeCompare(patientKey(b));
  });
}
