import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/api-client";
import { useAuth } from "@/lib/auth/auth-context";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { buildFollowUpAppointmentHref } from "@/features/consultation/components/consultation-dashboard-ui-helpers";

export interface QueueRow {
  id: string;
  appointmentId?: string | null;
  patientId?: string | null;
  patientName: string;
  status: string;
  startTime?: string | null;
  chiefComplaint?: string | null;
  type?: string | null;
  tokenNumber?: number;
  tokenType?: string;
  visitSummary?: string | null;
  invoice?: { status?: string | null } | null;
  kind?: "appointment" | "queue";
  createdAt?: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface DashboardStats {
  scheduledToday: number;
  waiting: number;
  inProgress: number;
  completed: number;
}

export interface DoctorNextNow {
  mode: "fcfs" | "scheduled";
  inProgress: QueueRow[];
  combinedUpcoming: QueueRow[];
}

export function useConsultationDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const userRole = user?.role ?? "";

  /* ── Stats ───────────────────────────────────────────── */
  const statsQuery = useQuery<DashboardStats>({
    queryKey: ["consultation", "stats"],
    queryFn: () => apiFetch<DashboardStats>("/consultation/stats"),
    enabled: isAuthenticated,
  });

  /* ── Queue / OPD rows ───────────────────────────────── */
  const queueQuery = useQuery<QueueRow[]>({
    queryKey: ["consultation", "queue"],
    queryFn: () => apiFetch<QueueRow[]>("/consultation/queue"),
    enabled: isAuthenticated,
  });

  /* ── Doctor now/next ─────────────────────────────────── */
  const doctorQuery = useQuery<DoctorNextNow>({
    queryKey: ["consultation", "doctor-next", user?.id],
    queryFn: () =>
      apiFetch<DoctorNextNow>(`/consultation/doctor-next/${user?.id}`),
    enabled: isAuthenticated && !!user?.id,
  });

  /* ── Navigation helpers ──────────────────────────────── */
  const handleStartConsultation = useCallback(
    async (appointmentId: string) => {
      try {
        await apiFetch(`/consultation/start/${appointmentId}`, {
          method: "POST",
        });
        navigate(`/consultation/${appointmentId}`);
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not start this consultation. Please try again.",
          "save",
        );
      }
    },
    [navigate],
  );

  const goToConsultationWorkspace = useCallback(
    (appointmentId: string) => {
      navigate(`/consultation/${appointmentId}`);
    },
    [navigate],
  );

  const handleScheduleFollowUp = useCallback(
    (patientId?: string | null) => {
      navigate(buildFollowUpAppointmentHref(patientId));
    },
    [navigate],
  );

  /* ── Derived state ───────────────────────────────────── */
  const stats = statsQuery.data;
  const queueRows = queueQuery.data;
  const doctorNowNext = doctorQuery.data;

  const isLoading =
    statsQuery.isLoading ||
    queueQuery.isLoading ||
    (!!user?.id && doctorQuery.isLoading);

  const isError =
    statsQuery.isError ||
    queueQuery.isError ||
    (!!user?.id && doctorQuery.isError);

  const refetch = useCallback(() => {
    statsQuery.refetch();
    queueQuery.refetch();
    if (user?.id) doctorQuery.refetch();
  }, [statsQuery, queueQuery, doctorQuery, user?.id]);

  return {
    opdQueueRows: queueRows ?? [],
    stats: {
      scheduledToday: stats?.scheduledToday ?? 0,
      waiting: stats?.waiting ?? 0,
      inProgress: stats?.inProgress ?? 0,
      completed: stats?.completed ?? 0,
    },
    doctorNowNext: doctorNowNext ?? {
      mode: "scheduled" as const,
      inProgress: [],
      combinedUpcoming: [],
    },
    isLoading,
    isError,
    refetch,
    handleStartConsultation,
    goToConsultationWorkspace,
    handleScheduleFollowUp,
    isStartingConsultation: false,
    currentUserRole: userRole,
    clinicType: "",
    canViewAllDoctors: false,
    selectedDoctorId: null as string | null,
    setSelectedDoctorId: (_: string | null) => {},
    scopedDoctorId: user?.id ?? null,
    doctorsList: [],
  };
}
