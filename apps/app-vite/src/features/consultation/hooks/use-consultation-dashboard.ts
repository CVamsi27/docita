import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-context";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { buildFollowUpAppointmentHref } from "@/features/consultation/components/consultation-dashboard-ui-helpers";
import {
  consultationDashboardApi,
  type ConsultationDashboardStats,
  type ConsultationDoctorNextNow,
  type ConsultationQueueRow,
} from "@/features/consultation/api/consultation.api";


export function useConsultationDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const userRole = user?.role ?? "";

  /* ── Stats ───────────────────────────────────────────── */
  const statsQuery = useQuery<ConsultationDashboardStats>({
    queryKey: ["consultation", "stats"],
    queryFn: consultationDashboardApi.getStats,
    enabled: isAuthenticated,
  });

  /* ── Queue / OPD rows ───────────────────────────────── */
  const queueQuery = useQuery<ConsultationQueueRow[]>({
    queryKey: ["consultation", "queue"],
    queryFn: consultationDashboardApi.getQueue,
    enabled: isAuthenticated,
  });

  /* ── Doctor now/next ─────────────────────────────────── */
  const doctorQuery = useQuery<ConsultationDoctorNextNow>({
    queryKey: ["consultation", "doctor-next", user?.id],
    queryFn: () =>
      consultationDashboardApi.getDoctorNextNow(user?.id ?? ""),
    enabled: isAuthenticated && !!user?.id,
  });

  /* ── Navigation helpers ──────────────────────────────── */
  const handleStartConsultation = useCallback(
    async (appointmentId: string) => {
      try {
        await consultationDashboardApi.start(appointmentId);
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
    // check-as-cast-density: allow-file — selectedDoctorId widened to string|null at the boundary for optional scoping
    selectedDoctorId: null as string | null,
    setSelectedDoctorId: (_: string | null) => {},
    scopedDoctorId: user?.id ?? null,
    doctorsList: [],
  };
}
