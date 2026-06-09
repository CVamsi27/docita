import type { QueueItem } from "@workspace/data-access";
import { getPatientFullName } from "@workspace/utils";
import { isQueueTokenWaiting } from "@/lib/utils/queue-token-status";
import type { DashboardAppointment, DoctorNextUpRow } from "./consultation-dashboard-helpers";
import { buildQueueNextUpRow } from "./consultation-dashboard-helpers";

const UPCOMING_APPOINTMENT_STATUSES = new Set([
  "scheduled",
  "confirmed",
  "checked-in",
]);

const MIN_SLOT_MINUTES = 5;

export interface BuildDoctorNowNextParams {
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

function filterInProgressForToday(
  items: DashboardAppointment[],
  isLocalToday: BuildDoctorNowNextParams["isLocalToday"],
): DashboardAppointment[] {
  return items.filter(
    (a) => a.status === "in-progress" && isLocalToday(a.startTime),
  );
}

function filterNextScheduled(
  items: DashboardAppointment[],
): DashboardAppointment[] {
  return items.filter((a) => UPCOMING_APPOINTMENT_STATUSES.has(a.status));
}

function buildSortedWalkInQueue(
  queueRows: QueueItem[],
  _isLocalToday: BuildDoctorNowNextParams["isLocalToday"],
): QueueItem[] {
  const walkInQueue = queueRows.filter(
    (q) => q.tokenType !== "scheduled" && isQueueTokenWaiting(q.status),
  );
  return [...walkInQueue].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (ta !== tb) return ta - tb;
    return (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0);
  });
}

function summarizeAppointment(apt: DashboardAppointment): DoctorNextUpRow {
  const aptName = apt.patient ? getPatientFullName(apt.patient) : "Patient";
  const visitSummary =
    apt.chiefComplaint?.trim() || apt.type?.trim() || undefined;
  return {
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
  };
}

function summarizeQueue(q: QueueItem): DoctorNextUpRow {
  return buildQueueNextUpRow(
    q,
    q.appointment?.chiefComplaint?.trim() ||
      q.appointment?.type?.trim() ||
      undefined,
  );
}

function buildFcfsNextUp(queueRows: QueueItem[]): DoctorNextUpRow[] {
  return queueRows.map((q) => summarizeQueue(q));
}

function buildScheduledWithGaps(
  appts: DashboardAppointment[],
  walkIns: QueueItem[],
  slotMs: number,
): DoctorNextUpRow[] {
  const combined: DoctorNextUpRow[] = [];
  let walkInIdx = 0;

  for (let i = 0; i < appts.length; i++) {
    const apt = appts[i];
    combined.push(summarizeAppointment(apt));

    const next = appts[i + 1];
    if (!next) continue;

    const gapMs =
      new Date(next.startTime).getTime() - new Date(apt.startTime).getTime();
    const gapSlots = Math.max(0, Math.floor(gapMs / slotMs) - 1);

    for (let s = 0; s < gapSlots && walkInIdx < walkIns.length; s++) {
      const q = walkIns[walkInIdx++];
      combined.push(summarizeQueue(q));
    }
  }

  while (walkInIdx < walkIns.length) {
    const q = walkIns[walkInIdx++];
    combined.push(summarizeQueue(q));
  }

  return combined;
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
  const inProgress = filterInProgressForToday(inProgressItems, isLocalToday);
  const nextScheduled = filterNextScheduled(todayAppointmentsSorted);
  const walkInSorted = buildSortedWalkInQueue(todayQueueRows, isLocalToday);
  const slotMs = Math.max(MIN_SLOT_MINUTES, slotMinutes) * 60 * 1000;

  if (todayAppointmentsSorted.length === 0) {
    return {
      inProgress,
      combinedUpcoming: buildFcfsNextUp(todayQueueRows),
      mode: "fcfs",
    };
  }

  return {
    inProgress,
    combinedUpcoming: buildScheduledWithGaps(
      nextScheduled,
      walkInSorted,
      slotMs,
    ),
    mode: "schedule",
  };
}
