import {
  type QueueItem,
  useAppointments,
  useDoctors,
  useQueueByDoctor,
} from "@workspace/data-access";
import { useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { useClinicSettings } from "@workspace/data-access";
import {
  DEFAULT_TIMEZONE,
  formatClinicTodayPickerIso,
} from "@workspace/utils";
import {
  isDateLocalToday,
  isQueueItemForTodayFn,
} from "./consultation-dashboard-helpers";
import { useConsultationNavigation } from "./use-consultation-navigation";
import { useConsultationMetrics } from "./use-consultation-metrics";
import { useDoctorScope } from "./use-consultation-doctor-scope";

export type { DoctorNextUpRow } from "./consultation-dashboard-helpers";

export const useConsultationDashboard = () => {
  const { user } = useAuth();
  const { canStartConsultation } = usePermissions();
  const { canAccess, currentTier, hasIntelligence } = usePermissionStore();
  const { data: clinic } = useClinicSettings();
  const clinicTz = clinic?.timezone?.trim() || DEFAULT_TIMEZONE;
  const today = formatClinicTodayPickerIso(clinicTz);

  const { router, goToConsultationWorkspace, handleStartConsultation, isStartingConsultation } =
    useConsultationNavigation();

  const isLocalToday = useCallback(
    (value?: string | Date | null): boolean => isDateLocalToday(value, clinicTz, today),
    [clinicTz, today],
  );
  const isQueueItemForToday = useCallback(
    (q: QueueItem): boolean => isQueueItemForTodayFn(q, clinicTz, today),
    [clinicTz, today],
  );

  const {
    selectedDoctorId,
    setSelectedDoctorId,
    doctorId,
    canViewAllDoctors,
  } = useDoctorScope({ userId: user?.id, userRole: user?.role });

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

  const metrics = useConsultationMetrics({
    appointmentsData: appointmentsData?.items,
    inProgressAppointmentsData: inProgressAppointmentsData?.items,
    queueData,
    clinic,
    isLocalToday,
    isQueueItemForToday,
  });

  return {
    appointments: appointmentsData?.items || [],
    todayAppointmentsSorted: metrics.todayAppointmentsSorted,
    doctorNowNext: metrics.doctorNowNext,
    queue: queueData || [],
    stats: metrics.stats,
    activeConsultations: metrics.activeConsultations,
    waitingList: metrics.waitingList,
    opdQueueRows: metrics.opdQueueRows,
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
    isStartingConsultation,
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
