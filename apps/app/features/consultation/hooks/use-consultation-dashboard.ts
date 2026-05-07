import {
  type QueueItem,
  useAppointments,
  useQueueByDoctor,
  useStartConsultation,
} from "@/hooks/api/use-appointments";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { canAccessTarget } from "@/lib/access-policy";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  isQueueTokenCompleted,
  isQueueTokenInProgress,
  isQueueTokenWaiting,
} from "@/lib/queue-token-status";
import { useClinicSettings } from "@/hooks/api/use-settings";
import {
  DEFAULT_TIMEZONE,
  formatClinicTodayPickerIso,
  formatUtcInstantAsClinicPickerIso,
} from "@workspace/utils";

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

export const useConsultationDashboard = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { canStartConsultation } = usePermissions();
  const { canAccess, workspaceProfile } = usePermissionStore();
  const { data: clinic } = useClinicSettings();
  const clinicTz = clinic?.timezone?.trim() || DEFAULT_TIMEZONE;
  const today = formatClinicTodayPickerIso(clinicTz);

  const isLocalToday = useCallback(
    (value?: string | Date | null): boolean => {
      if (!value) return true;
      const date =
        typeof value === "string"
          ? new Date(value)
          : value instanceof Date
            ? value
            : new Date(value);
      if (Number.isNaN(date.getTime())) return true;
      return formatUtcInstantAsClinicPickerIso(date, clinicTz) === today;
    },
    [clinicTz, today],
  );

  const isQueueItemForToday = useCallback(
    (q: QueueItem): boolean => {
    const appointmentStart =
        typeof (q as unknown as { appointment?: { startTime?: unknown } })
          ?.appointment?.startTime === "string"
          ? ((q as unknown as { appointment?: { startTime?: string } })
              .appointment?.startTime ?? null)
          : null;

      return isLocalToday(appointmentStart) || isLocalToday(q.createdAt);
    },
    [isLocalToday],
  );
  const shouldScopeToOwnConsultations =
    user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR";
  const doctorId = shouldScopeToOwnConsultations ? user?.id : undefined;
  const canAccessQueueApi = canAccessTarget(
    APP_ACCESS_TARGETS.API_QUEUE,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      workspaceProfile,
    },
    "read",
  );

  const { data: appointmentsData, isLoading: isLoadingAppointments } =
    useAppointments({
      date: today,
      ...(doctorId ? { doctorId } : {}),
    });

  const { data: inProgressAppointmentsData, isLoading: isLoadingInProgress } =
    useAppointments({
      status: "in-progress",
      limit: 100,
      ...(doctorId ? { doctorId } : {}),
    });

  const { data: queueData, isLoading: isLoadingQueue } =
    useQueueByDoctor(doctorId, undefined, canAccessQueueApi);
  const startConsultation = useStartConsultation();

  const stats = useMemo(() => {
    const todayAppts = appointmentsData?.items || [];
    const inProgressAppts = inProgressAppointmentsData?.items ?? [];
    const queue = (queueData || []).filter(isQueueItemForToday);
    const appointmentIdsWithQueueToken = new Set(
      queue
        .map((q) => q.appointmentId)
        .filter((id): id is string => Boolean(id)),
    );
    const inProgressFromQueue = queue.filter((q) =>
      isQueueTokenInProgress(q.status),
    ).length;
    const inProgressAppointmentsOnly = inProgressAppts.filter(
      (a) =>
        a.status === "in-progress" &&
        a.id &&
        !appointmentIdsWithQueueToken.has(a.id),
    ).length;

    return {
      scheduledToday: todayAppts.length,
      waiting: queue.filter((q) => isQueueTokenWaiting(q.status)).length,
      inProgress: inProgressFromQueue + inProgressAppointmentsOnly,
      completed: queue.filter((q) => isQueueTokenCompleted(q.status)).length,
    };
  }, [
    appointmentsData,
    inProgressAppointmentsData,
    isQueueItemForToday,
    queueData,
  ]);

  const todayAppointmentsSorted = useMemo(() => {
    const items = appointmentsData?.items || [];
    return [...items].sort((a, b) => {
      const ta = new Date(a.startTime).getTime();
      const tb = new Date(b.startTime).getTime();
      return ta - tb;
    });
  }, [appointmentsData?.items]);

  const activeConsultations = useMemo(() => {
    const fromQueue = (queueData || [])
      .filter(isQueueItemForToday)
      .filter((q) => isQueueTokenInProgress(q.status));
    const coveredAppointmentIds = new Set(
      fromQueue
        .map((q) => q.appointmentId)
        .filter((id): id is string => Boolean(id)),
    );
    const inProgressAppts = inProgressAppointmentsData?.items ?? [];
    const withoutQueueToken: QueueItem[] = [];

    for (const a of inProgressAppts) {
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
          : new Date(a.updatedAt as Date).toISOString();

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
  }, [inProgressAppointmentsData, isLocalToday, isQueueItemForToday, queueData]);

  const goToConsultationWorkspace = (appointmentId: string) => {
    router.push(`/consultation/${appointmentId}`);
  };

  const waitingList = useMemo(() => {
    return (queueData || [])
      .filter(isQueueItemForToday)
      .filter((q) => isQueueTokenWaiting(q.status));
  }, [isQueueItemForToday, queueData]);

  /** Active (in consult) first, then waiting; sort by token number within each band. */
  const opdQueueRows = useMemo(() => {
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
  }, [activeConsultations, waitingList]);

  const doctorNowNext = useMemo(() => {
    const inProgress = (inProgressAppointmentsData?.items ?? []).filter(
      (a) => a.status === "in-progress" && isLocalToday(a.startTime),
    );
    const nextScheduled = todayAppointmentsSorted.filter((a) =>
      ["scheduled", "confirmed", "checked-in"].includes(a.status),
    );

    const todayQueueRows = opdQueueRows.filter(isQueueItemForToday);

    const walkInQueue = todayQueueRows.filter(
      (q) => q.tokenType !== "scheduled" && isQueueTokenWaiting(q.status),
    );
    const walkInSorted = [...walkInQueue].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      if (ta !== tb) return ta - tb;
      return (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0);
    });

    const slotMinutes =
      typeof (clinic as unknown as { slotDuration?: number | null })
        ?.slotDuration === "number"
        ? ((clinic as unknown as { slotDuration?: number | null })
            .slotDuration ?? 15)
        : 15;
    const slotMs = Math.max(5, slotMinutes) * 60 * 1000;

    const combinedUpcoming: DoctorNextUpRow[] = [];

    // If there is no schedule today, fall back to FCFS (queue order).
    if (todayAppointmentsSorted.length === 0) {
      for (const q of todayQueueRows) {
        const name = q.patient
          ? `${q.patient.firstName} ${q.patient.lastName}`
          : "Patient";
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
      return { inProgress, combinedUpcoming, mode: "fcfs" as const };
    }

    // Otherwise: schedule in time order, fill gaps with walk-ins (FCFS).
    const appts = nextScheduled;
    let walkInIdx = 0;

    for (let i = 0; i < appts.length; i++) {
      const apt = appts[i];
      const aptName = apt.patient
        ? `${apt.patient.firstName} ${apt.patient.lastName}`
        : "Patient";
      const visitSummary =
        apt.chiefComplaint?.trim() ||
        apt.type?.trim() ||
        undefined;
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
        const name = q.patient
          ? `${q.patient.firstName} ${q.patient.lastName}`
          : "Patient";
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

    // Add remaining walk-ins after the schedule list (still FCFS).
    while (walkInIdx < walkInSorted.length) {
      const q = walkInSorted[walkInIdx++];
      const name = q.patient
        ? `${q.patient.firstName} ${q.patient.lastName}`
        : "Patient";
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

    return { inProgress, combinedUpcoming, mode: "schedule" as const };
  }, [
    clinic,
    inProgressAppointmentsData?.items,
    isLocalToday,
    isQueueItemForToday,
    opdQueueRows,
    todayAppointmentsSorted,
  ]);

  const handleStartConsultation = async (appointmentId: string) => {
    try {
      const result = await startConsultation.mutateAsync({ appointmentId });
      goToConsultationWorkspace(result.appointmentId);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not open this consultation right now. Please try again.",
        "save",
      );
    }
  };

  return {
    appointments: appointmentsData?.items || [],
    todayAppointmentsSorted,
    doctorNowNext,
    queue: queueData || [],
    stats,
    activeConsultations,
    waitingList,
    opdQueueRows,
    isLoading: isLoadingAppointments || isLoadingQueue || isLoadingInProgress,
    handleStartConsultation,
    goToConsultationWorkspace,
    canAccessQueue: canAccessQueueApi,
    canStartConsultation,
    isStartingConsultation: startConsultation.isPending,
    currentUserId: user?.id,
    currentUserRole: user?.role,
    clinicType: clinic?.type ?? null,
    router,
  };
};
