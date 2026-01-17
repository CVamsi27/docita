import { useMemo } from "react";
import { useDashboardStats } from "@/hooks/api/use-dashboard";
import { useTodayAppointments } from "@/hooks/api/use-appointments";
import { useRecentPatients } from "@/hooks/api/use-patients";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  DashboardAppointment,
  DashboardPatient,
  PaginatedResponse,
} from "@workspace/types";

export const useDashboardLogic = () => {
  const { canAccess } = usePermissionStore();

  // ✅ OPTIMIZATION: All hooks run in parallel automatically via React Query
  const { data, isLoading: loadingStats } = useDashboardStats();
  const { data: rawAppointmentsResponse, isLoading: loadingAppointments } =
    useTodayAppointments();
  const { data: recentPatientsResponse, isLoading: loadingPatients } =
    useRecentPatients(5);

  const stats = useMemo(
    () => ({
      totalPatients: data?.totalPatients ?? 0,
      todayAppointments: data?.todayAppointments ?? 0,
      activePrescriptions: data?.activePrescriptions ?? 0,
      pendingReports: data?.pendingReports ?? 0,
      newPatientsThisMonth: data?.newPatientsThisMonth ?? 0,
    }),
    [data],
  );

  // ✅ OPTIMIZATION: Memoize filtered patients
  const castRecentPatients = useMemo<DashboardPatient[]>(() => {
    const paginatedResponse =
      recentPatientsResponse as unknown as PaginatedResponse<DashboardPatient>;
    const patients = paginatedResponse?.items || [];
    return patients.filter(
      (p): p is DashboardPatient => !!(p && p.id),
    );
  }, [recentPatientsResponse]);

  // ✅ OPTIMIZATION: Memoize sorted appointments and computed values
  const {
    todayAppointments,
    completedToday,
    inProgressToday,
    currentPatient,
    nextPatients,
    waitingCount,
  } = useMemo(() => {
    // Extract items from paginated response
    const paginatedResponse =
      rawAppointmentsResponse as unknown as PaginatedResponse<DashboardAppointment>;
    const appointmentsData = paginatedResponse?.items || [];

    const sorted = [...appointmentsData].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    const completed = sorted.filter((a) => a.status === "completed").length;
    const inProgress = sorted.filter((a) => a.status === "in-progress").length;
    const waiting = sorted.filter((a) => a.status === "scheduled").length;

    // Current patient is the one in-progress
    const current = sorted.find((a) => a.status === "in-progress");

    // Next patients are the scheduled ones (take next 3)
    const next = sorted.filter((a) => a.status === "scheduled").slice(0, 3);

    return {
      todayAppointments: sorted,
      completedToday: completed,
      inProgressToday: inProgress,
      currentPatient: current,
      nextPatients: next,
      waitingCount: waiting,
    };
  }, [rawAppointmentsResponse]);

  const isLoading = loadingStats || loadingAppointments || loadingPatients;

  return {
    state: {
      stats,
      castRecentPatients,
      todayAppointments,
      completedToday,
      inProgressToday,
      currentPatient,
      nextPatients,
      waitingCount,
      isLoading,
      canAccess,
    },
    permissions: {
      canAccess,
    },
  };
};
