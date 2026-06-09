import { useMemo } from "react";
import type { QueueItem } from "@workspace/data-access";
import type { AppointmentListItemContractResponse } from "@workspace/types";
import {
  buildActiveConsultations,
  buildDoctorNowNext,
  buildOpdQueueRows,
  buildStats,
  buildWaitingList,
  getClinicSlotMinutes,
  sortAppointmentsByStartTime,
} from "./consultation-dashboard-helpers";

interface UseConsultationMetricsParams {
  appointmentsData: AppointmentListItemContractResponse[] | undefined;
  inProgressAppointmentsData: AppointmentListItemContractResponse[] | undefined;
  queueData: QueueItem[] | undefined;
  clinic: unknown;
  isLocalToday: (value?: string | Date | null) => boolean;
  isQueueItemForToday: (q: QueueItem) => boolean;
}

export function useConsultationMetrics({
  appointmentsData,
  inProgressAppointmentsData,
  queueData,
  clinic,
  isLocalToday,
  isQueueItemForToday,
}: UseConsultationMetricsParams) {
  const todayQueue = useMemo(
    () => (queueData || []).filter(isQueueItemForToday),
    [isQueueItemForToday, queueData],
  );

  const stats = useMemo(
    () => buildStats(appointmentsData ?? [], inProgressAppointmentsData ?? [], todayQueue),
    [appointmentsData, inProgressAppointmentsData, todayQueue],
  );

  const todayAppointmentsSorted = useMemo(
    () => sortAppointmentsByStartTime(appointmentsData ?? []),
    [appointmentsData],
  );

  const activeConsultations = useMemo(
    () => buildActiveConsultations(todayQueue, inProgressAppointmentsData ?? [], isLocalToday),
    [todayQueue, inProgressAppointmentsData, isLocalToday],
  );

  const waitingList = useMemo(() => buildWaitingList(todayQueue), [todayQueue]);

  const opdQueueRows = useMemo(
    () => buildOpdQueueRows(activeConsultations, waitingList),
    [activeConsultations, waitingList],
  );

  const doctorNowNext = useMemo(
    () =>
      buildDoctorNowNext({
        inProgressItems: inProgressAppointmentsData ?? [],
        todayAppointmentsSorted,
        todayQueueRows: opdQueueRows.filter(isQueueItemForToday),
        slotMinutes: getClinicSlotMinutes(clinic),
        isLocalToday,
      }),
    [
      clinic, inProgressAppointmentsData, isLocalToday,
      isQueueItemForToday, opdQueueRows, todayAppointmentsSorted,
    ],
  );

  return {
    todayQueue,
    stats,
    todayAppointmentsSorted,
    activeConsultations,
    waitingList,
    opdQueueRows,
    doctorNowNext,
  };
}
