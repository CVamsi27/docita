import { useMemo } from "react";
import { apiHooks } from "@/lib/api-hooks";
import { Feature, usePermissionStore } from "@/lib/stores/permission-store";

// Types derived from usage in original page.tsx
interface Patient {
  firstName: string;
  lastName: string;
}

interface Appointment {
  id: string;
  startTime: string | Date;
  status: "scheduled" | "completed" | "in-progress" | "cancelled" | "no-show";
  type: string;
  patient: Patient;
}

interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

interface PatientListItem extends Patient {
  id: string;
  email?: string;
  bloodGroup?: string;
  updatedAt?: string;
  tags?: Array<{ id: string; tag: string; color: string }>;
}

interface AppointmentListItem extends Appointment {
  notes?: string;
  createdAt?: string;
}

export const useDashboardLogic = () => {
  const { canAccess } = usePermissionStore();

  // ✅ OPTIMIZATION: All hooks run in parallel automatically via React Query
  const { data, isLoading: loadingStats } = apiHooks.useDashboardStats();
  const { data: rawAppointmentsResponse, isLoading: loadingAppointments } =
    apiHooks.useTodayAppointments();
  const { data: recentPatientsResponse, isLoading: loadingPatients } =
    apiHooks.useRecentPatients(5);

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
  const castRecentPatients = useMemo(() => {
    const paginatedResponse =
      recentPatientsResponse as unknown as PaginatedResponse<PatientListItem>;
    const patients = paginatedResponse?.items || [];
    return patients.filter(
      (p): p is PatientListItem & { id: string } => !!(p && p.id),
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
      rawAppointmentsResponse as unknown as PaginatedResponse<AppointmentListItem>;
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
