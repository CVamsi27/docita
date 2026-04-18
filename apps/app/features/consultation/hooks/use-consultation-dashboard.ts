import {
  type QueueItem,
  useAppointments,
  useQueueByDoctor,
  useStartConsultation,
} from "@/hooks/api/use-appointments";
import { useMemo } from "react";
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

export const useConsultationDashboard = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { canStartConsultation } = usePermissions();
  const { canAccess } = usePermissionStore();
  const today = new Date().toISOString().split("T")[0] ?? "";
  const shouldScopeToOwnConsultations = user?.role === "DOCTOR";
  const doctorId = shouldScopeToOwnConsultations ? user?.id : undefined;
  const canAccessQueueApi = canAccessTarget(
    APP_ACCESS_TARGETS.API_QUEUE,
    {
      role: user?.role,
      canAccessFeature: canAccess,
    },
    "read",
  );

  const { data: appointmentsData, isLoading: isLoadingAppointments } =
    useAppointments({
      date: today,
      ...(doctorId ? { doctorId } : {}),
    });

  const { data: queueData, isLoading: isLoadingQueue } =
    useQueueByDoctor(doctorId, undefined, canAccessQueueApi);
  const startConsultation = useStartConsultation();

  const stats = useMemo(() => {
    const todayAppts = appointmentsData?.items || [];
    const queue = queueData || [];
    const appointmentIdsWithQueueToken = new Set(
      queue
        .map((q) => q.appointmentId)
        .filter((id): id is string => Boolean(id)),
    );
    const inProgressFromQueue = queue.filter((q) =>
      isQueueTokenInProgress(q.status),
    ).length;
    const inProgressAppointmentsOnly = todayAppts.filter(
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
  }, [appointmentsData, queueData]);

  const activeConsultations = useMemo(() => {
    const fromQueue = (queueData || []).filter((q) =>
      isQueueTokenInProgress(q.status),
    );
    const coveredAppointmentIds = new Set(
      fromQueue
        .map((q) => q.appointmentId)
        .filter((id): id is string => Boolean(id)),
    );
    const todayAppts = appointmentsData?.items ?? [];
    const withoutQueueToken: QueueItem[] = [];

    for (const a of todayAppts) {
      if (
        a.status !== "in-progress" ||
        !a.id ||
        coveredAppointmentIds.has(a.id)
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
      });
    }

    return [...fromQueue, ...withoutQueueToken];
  }, [queueData, appointmentsData]);

  const waitingList = useMemo(() => {
    return (queueData || []).filter((q) => isQueueTokenWaiting(q.status));
  }, [queueData]);

  const handleStartConsultation = async (appointmentId: string) => {
    try {
      const result = await startConsultation.mutateAsync({ appointmentId });
      router.push(`/consultation/${result.appointmentId}`);
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
    queue: queueData || [],
    stats,
    activeConsultations,
    waitingList,
    isLoading: isLoadingAppointments || isLoadingQueue,
    handleStartConsultation,
    canStartConsultation: canStartConsultation && canAccessQueueApi,
    isStartingConsultation: startConsultation.isPending,
    currentUserId: user?.id,
    router,
  };
};
