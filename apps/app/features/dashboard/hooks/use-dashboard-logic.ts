import { useMemo } from "react";
import { useDashboardStats } from "@/hooks/api/use-dashboard";
import { useTodayAppointments } from "@/hooks/api/use-appointments";
import { useRecentPatients } from "@/hooks/api/use-patients";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  DashboardAppointment,
  DashboardPatient,
} from "@workspace/types";

export const useDashboardLogic = () => {
  const { canAccess } = usePermissionStore();

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
      (appointment): appointment is DashboardAppointment =>
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
