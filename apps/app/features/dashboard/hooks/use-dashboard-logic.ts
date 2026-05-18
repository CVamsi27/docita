import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  dashboardStatsSchema,
  type DashboardStats,
  type DashboardPatient,
} from "@workspace/types";
import { useDashboardStats } from "@workspace/data-access";
import { useTodayAppointments } from "@workspace/data-access";
import { useRecentPatients } from "@workspace/data-access";
import { usePendingJoinRequestCount } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { type AppointmentListItem } from "@workspace/data-access";
import { logger } from "@/lib/monitoring/logger";

function defaultDashboardStats(): DashboardStats {
  return {
    totalPatients: 0,
    totalDoctors: 0,
    newPatientsThisMonth: 0,
    todayAppointments: 0,
    totalAppointments: 0,
    activePrescriptions: 0,
    pendingReports: 0,
    monthlyRevenue: 0,
    recentActivity: [],
    upcomingAppointments: [],
  };
}

export const useDashboardLogic = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { canAccess } = usePermissionStore();

  const {
    data: rawStatsData,
    isLoading: loadingStats,
    isError,
    isFetching: fetchingStats,
    dataUpdatedAt: statsDataUpdatedAt,
    refetch: refetchStats,
  } = useDashboardStats();
  const {
    data: rawAppointmentsResponse,
    isLoading: loadingAppointments,
    isFetching: fetchingAppointments,
    dataUpdatedAt: appointmentsDataUpdatedAt,
    refetch: refetchAppointments,
  } = useTodayAppointments();
  const {
    data: recentPatientsResponse,
    isLoading: loadingPatients,
    isFetching: fetchingPatients,
    dataUpdatedAt: patientsDataUpdatedAt,
    refetch: refetchPatients,
  } = useRecentPatients(5);
  const {
    data: pendingJoinRequestsResponse,
    isLoading: loadingJoinRequests,
    isFetching: fetchingJoinRequests,
    dataUpdatedAt: joinDataUpdatedAt,
    refetch: refetchJoinRequests,
  } = usePendingJoinRequestCount(isAdmin);

  const dashboardStats = useMemo((): DashboardStats => {
    if (rawStatsData == null) {
      return defaultDashboardStats();
    }
    const parsed = dashboardStatsSchema.safeParse(rawStatsData);
    if (parsed.success) {
      return parsed.data;
    }
    logger.warn("Dashboard stats response failed schema validation", {
      issues: parsed.error.issues,
    });
    return defaultDashboardStats();
  }, [rawStatsData]);

  const stats = useMemo(
    () => ({
      totalPatients: dashboardStats.totalPatients,
      todayAppointments: dashboardStats.todayAppointments,
      activePrescriptions: dashboardStats.activePrescriptions,
      pendingReports: dashboardStats.pendingReports,
      newPatientsThisMonth: dashboardStats.newPatientsThisMonth,
    }),
    [dashboardStats],
  );

  const castRecentPatients = useMemo<DashboardPatient[]>(() => {
    const patients = recentPatientsResponse?.items || [];
    return patients.filter((p): p is DashboardPatient => !!(p && p.id));
  }, [recentPatientsResponse]);

  const {
    todayAppointments,
    completedToday,
    inProgressToday,
    currentPatient,
    nextPatients,
    waitingCount,
  } = useMemo(() => {
    const appointmentsData = rawAppointmentsResponse?.items || [];
    const validAppointments = appointmentsData.filter(
      (appointment): appointment is AppointmentListItem =>
        Boolean(appointment.id && appointment.startTime),
    );

    const sorted = [...validAppointments].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    const completed = sorted.filter((a) => a.status === "completed").length;
    const inProgress = sorted.filter((a) => a.status === "in-progress").length;
    const waiting = sorted.filter((a) => a.status === "scheduled").length;

    const current = sorted.find((a) => a.status === "in-progress");

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

  const isLoading =
    loadingStats ||
    loadingAppointments ||
    loadingPatients ||
    loadingJoinRequests;
  const pendingJoinRequests = pendingJoinRequestsResponse?.count ?? 0;

  const refetchAll = useCallback(async () => {
    const tasks: Promise<unknown>[] = [
      refetchStats(),
      refetchAppointments(),
      refetchPatients(),
    ];
    if (isAdmin) {
      tasks.push(refetchJoinRequests());
    }
    await Promise.all(tasks);
    await queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
  }, [
    isAdmin,
    queryClient,
    refetchStats,
    refetchAppointments,
    refetchPatients,
    refetchJoinRequests,
  ]);

  const isRefreshing =
    fetchingStats ||
    fetchingAppointments ||
    fetchingPatients ||
    fetchingJoinRequests;

  const lastDataUpdatedAtMs = useMemo(() => {
    const candidates = [
      statsDataUpdatedAt,
      appointmentsDataUpdatedAt,
      patientsDataUpdatedAt,
      isAdmin ? joinDataUpdatedAt : 0,
    ].filter((v) => typeof v === "number" && v > 0);
    return candidates.length ? Math.max(...candidates) : null;
  }, [
    statsDataUpdatedAt,
    appointmentsDataUpdatedAt,
    patientsDataUpdatedAt,
    joinDataUpdatedAt,
    isAdmin,
  ]);

  return {
    state: {
      stats,
      recentActivity: dashboardStats.recentActivity,
      upcomingAppointments: dashboardStats.upcomingAppointments,
      castRecentPatients,
      todayAppointments,
      completedToday,
      inProgressToday,
      currentPatient,
      nextPatients,
      waitingCount,
      pendingJoinRequests,
      isLoading,
      isError,
      refetch: refetchAll,
      refetchAll,
      lastDataUpdatedAtMs,
      isRefreshing,
      canAccess,
    },
    permissions: {
      canAccess,
    },
  };
};
