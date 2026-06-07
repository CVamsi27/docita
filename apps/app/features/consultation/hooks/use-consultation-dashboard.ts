import {
  type QueueItem,
  useAppointments,
  useDoctors,
  useQueueByDoctor,
  useStartConsultation,
} from "@workspace/data-access";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  APP_ACCESS_TARGETS,
  isClinicWideAppointmentRole,
  resolveDoctorScopedAppointmentFilter,
} from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useClinicSettings } from "@workspace/data-access";
import {
  DEFAULT_TIMEZONE,
  formatClinicTodayPickerIso,
} from "@workspace/utils";
import {
  buildActiveConsultations,
  buildDoctorNowNext,
  buildOpdQueueRows,
  buildStats,
  buildWaitingList,
  getClinicSlotMinutes,
  isDateLocalToday,
  isQueueItemForTodayFn,
  sortAppointmentsByStartTime,
} from "./consultation-dashboard-helpers";

export type { DoctorNextUpRow } from "./consultation-dashboard-helpers";

export const useConsultationDashboard = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { canStartConsultation } = usePermissions();
  const { canAccess, currentTier, hasIntelligence } = usePermissionStore();
  const { data: clinic } = useClinicSettings();
  const clinicTz = clinic?.timezone?.trim() || DEFAULT_TIMEZONE;
  const today = formatClinicTodayPickerIso(clinicTz);

  const isLocalToday = useCallback(
    (value?: string | Date | null): boolean => isDateLocalToday(value, clinicTz, today),
    [clinicTz, today],
  );
  const isQueueItemForToday = useCallback(
    (q: QueueItem): boolean => isQueueItemForTodayFn(q, clinicTz, today),
    [clinicTz, today],
  );

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>();
  const appliedDefaultDoctorRef = useRef(false);

  useEffect(() => {
    if (appliedDefaultDoctorRef.current || !user?.id) return;
    if (user.role === "ADMIN_DOCTOR" || user.role === "DOCTOR") {
      setSelectedDoctorId(user.id);
    }
    appliedDefaultDoctorRef.current = true;
  }, [user?.id, user?.role]);

// jscpd:ignore-start
  const canViewAllDoctors = isClinicWideAppointmentRole(user?.role);
  const doctorScope = useMemo(
    () =>
      resolveDoctorScopedAppointmentFilter({
        role: user?.role,
        userId: user?.id,
        requestedDoctorId: selectedDoctorId,
      }),
    [selectedDoctorId, user?.id, user?.role],
  );
  const doctorId = doctorScope.scopedDoctorId;
// jscpd:ignore-end

  const { data: doctors = [] } = useDoctors();

  const canAccessQueueApi = canAccessTarget(
    APP_ACCESS_TARGETS.API_QUEUE,
    { role: user?.role, canAccessFeature: canAccess, currentTier, hasIntelligence },
    "read",
  );

  const {
    data: appointmentsData, isLoading: isLoadingAppointments,
    isError: isAppointmentsError, refetch: refetchAppointments,
  } = useAppointments({ date: today, ...(doctorId ? { doctorId } : {}) });

  const {
    data: inProgressAppointmentsData, isLoading: isLoadingInProgress,
    isError: isInProgressError, refetch: refetchInProgress,
  } = useAppointments({ status: "in-progress", limit: 100, ...(doctorId ? { doctorId } : {}) });

  const {
    data: queueData, isLoading: isLoadingQueue,
    isError: isQueueError, refetch: refetchQueue,
  } = useQueueByDoctor(doctorId, undefined, canAccessQueueApi);

  const startConsultation = useStartConsultation();

  const todayQueue = useMemo(
    () => (queueData || []).filter(isQueueItemForToday),
    [isQueueItemForToday, queueData],
  );

  const stats = useMemo(
    () => buildStats(appointmentsData?.items ?? [], inProgressAppointmentsData?.items ?? [], todayQueue),
    [appointmentsData?.items, inProgressAppointmentsData?.items, todayQueue],
  );

  const todayAppointmentsSorted = useMemo(
    () => sortAppointmentsByStartTime(appointmentsData?.items ?? []),
    [appointmentsData?.items],
  );

  const activeConsultations = useMemo(
    () => buildActiveConsultations(todayQueue, inProgressAppointmentsData?.items ?? [], isLocalToday),
    [todayQueue, inProgressAppointmentsData?.items, isLocalToday],
  );

  const waitingList = useMemo(() => buildWaitingList(todayQueue), [todayQueue]);

  const opdQueueRows = useMemo(
    () => buildOpdQueueRows(activeConsultations, waitingList),
    [activeConsultations, waitingList],
  );

  const doctorNowNext = useMemo(
    () =>
      buildDoctorNowNext({
        inProgressItems: inProgressAppointmentsData?.items ?? [],
        todayAppointmentsSorted,
        todayQueueRows: opdQueueRows.filter(isQueueItemForToday),
        slotMinutes: getClinicSlotMinutes(clinic),
        isLocalToday,
      }),
    [
      clinic, inProgressAppointmentsData?.items, isLocalToday,
      isQueueItemForToday, opdQueueRows, todayAppointmentsSorted,
    ],
  );

  const goToConsultationWorkspace = (appointmentId: string) => {
    router.push(`/consultation/${appointmentId}`);
  };

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
    isError: isAppointmentsError || isInProgressError || isQueueError,
    refetch: () => {
      void refetchAppointments();
      void refetchInProgress();
      void refetchQueue();
    },
    handleStartConsultation,
    goToConsultationWorkspace,
    canAccessQueue: canAccessQueueApi,
    canStartConsultation,
    isStartingConsultation: startConsultation.isPending,
    currentUserId: user?.id,
    currentUserRole: user?.role,
    clinicType: clinic?.type ?? null,
    router,
    canViewAllDoctors,
    selectedDoctorId,
    setSelectedDoctorId,
    scopedDoctorId: doctorId,
    doctorsList: doctors,
  };
};
