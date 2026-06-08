import type { QueueItem } from "@workspace/data-access";
import type { AppointmentListItemContractResponse } from "@workspace/types";
import { isQueueTokenInProgress, isQueueTokenWaiting } from "@/lib/utils/queue-token-status";

export function buildWaitingList(todayQueue: QueueItem[]): QueueItem[] {
  return todayQueue.filter((q) => isQueueTokenWaiting(q.status));
}

function buildInProgressAppointmentQueueItem(
  a: AppointmentListItemContractResponse,
  updatedAt: string,
): QueueItem {
  return {
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
          doctor: { id: a.doctor?.id ?? "", name: a.doctor?.name ?? "" },
          type: a.type ?? null,
          chiefComplaint: a.chiefComplaint ?? null,
        }
      : undefined,
  };
}

function collectInProgressAppointmentQueueItems(
  inProgressAppointments: AppointmentListItemContractResponse[],
  coveredIds: Set<string>,
  isLocalToday: (value: string | Date | null | undefined) => boolean,
): QueueItem[] {
  const items: QueueItem[] = [];
  for (const a of inProgressAppointments) {
    if (
      a.status !== "in-progress" ||
      !a.id ||
      coveredIds.has(a.id) ||
      !isLocalToday(a.startTime)
    )
      continue;
    const updatedAt =
      typeof a.updatedAt === "string"
        ? a.updatedAt
        : new Date(a.updatedAt).toISOString();
    items.push(buildInProgressAppointmentQueueItem(a, updatedAt));
  }
  return items;
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
  const withoutQueueToken = collectInProgressAppointmentQueueItems(
    inProgressAppointments,
    coveredAppointmentIds,
    isLocalToday,
  );

  return [...fromQueue, ...withoutQueueToken];
}

function rankQueueItem(q: QueueItem): number {
  if (isQueueTokenInProgress(q.status)) return 0;
  if (isQueueTokenWaiting(q.status)) return 1;
  return 2;
}

function tokenSort(q: QueueItem): number {
  return q.tokenNumber > 0 ? q.tokenNumber : 10_000;
}

function patientKey(q: QueueItem): string {
  return `${q.patient?.lastName ?? ""}\u0000${q.patient?.firstName ?? ""}`;
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
  return Array.from(byId.values()).sort((a, b) => {
    const ra = rankQueueItem(a);
    const rb = rankQueueItem(b);
    if (ra !== rb) return ra - rb;
    const ta = tokenSort(a);
    const tb = tokenSort(b);
    if (ta !== tb) return ta - tb;
    return patientKey(a).localeCompare(patientKey(b));
  });
}
