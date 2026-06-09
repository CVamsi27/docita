import type { AppointmentListItemContractResponse } from "@workspace/types";
import type { QueueItem } from "@workspace/data-access";
import {
  isQueueTokenCompleted,
  isQueueTokenInProgress,
  isQueueTokenWaiting,
} from "@/lib/utils/queue-token-status";

export interface DashboardStats {
  scheduledToday: number;
  waiting: number;
  inProgress: number;
  completed: number;
}

function collectQueueAppointmentIds(queue: QueueItem[]): Set<string> {
  return new Set(
    queue
      .map((q) => q.appointmentId)
      .filter((id): id is string => Boolean(id)),
  );
}

function countInProgressFromQueue(queue: QueueItem[]): number {
  return queue.filter((q) => isQueueTokenInProgress(q.status)).length;
}

function countInProgressAppointments(
  appointments: AppointmentListItemContractResponse[],
  coveredIds: Set<string>,
): number {
  return appointments.filter(
    (a) =>
      a.status === "in-progress" && a.id && !coveredIds.has(a.id),
  ).length;
}

export function buildStats(
  todayAppointments: AppointmentListItemContractResponse[],
  inProgressAppointments: AppointmentListItemContractResponse[],
  todayQueue: QueueItem[],
): DashboardStats {
  const appointmentIdsWithQueueToken = collectQueueAppointmentIds(todayQueue);
  const inProgressFromQueue = countInProgressFromQueue(todayQueue);
  const inProgressAppointmentsOnly = countInProgressAppointments(
    inProgressAppointments,
    appointmentIdsWithQueueToken,
  );

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
