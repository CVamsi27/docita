import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-context";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { buildFollowUpAppointmentHref } from "@/features/consultation/components/consultation-dashboard-ui-helpers";
import { getOpdQueueSummaryLine } from "@/features/consultation/lib/opd-queue-display";
import { getPatientFullName } from "@workspace/utils";
import {
  consultationDashboardApi,
  type ConsultationDashboardStats,
  type ConsultationDoctorNextNow,
  type ConsultationQueueRow,
} from "@/features/consultation/api/consultation.api";
import type { QueueToken, TodayQueueEntry } from "@workspace/types";

/**
 * The queue endpoints are ordered by priority then token number, so the
 * now/next panel reads as scheduled-with-walk-ins rather than arrival order.
 * Kept as a named constant so the union stays explicit rather than narrowing
 * to a literal at the use site.
 */
const CONSULTATION_NOW_NEXT_MODE: ConsultationDoctorNextNow["mode"] =
  "scheduled";

/** Shown when a queue row arrives without patient name parts. */
const UNKNOWN_PATIENT_NAME = "Unknown patient";

/**
 * `GET /queue` returns queue-token rows; `GET /queue/today` returns today's
 * entries. They are not field-compatible, so both are projected onto the single
 * row shape the dashboard sections render. `appointmentType` is the discriminator:
 * only the today projection flattens it, while the token projection keeps it
 * nested under `appointment`.
 */
function isTodayEntry(
  entry: QueueToken | TodayQueueEntry,
): entry is TodayQueueEntry {
  return "appointmentType" in entry;
}

function toQueueRow(entry: QueueToken | TodayQueueEntry): ConsultationQueueRow {
  const today = isTodayEntry(entry);
  const appointment = today ? null : entry.appointment;
  const chiefComplaint = today
    ? entry.chiefComplaint
    : (appointment?.chiefComplaint ?? null);
  const type = today ? entry.appointmentType : (appointment?.type ?? null);

  return {
    id: entry.id,
    appointmentId: entry.appointmentId,
    patientId: entry.patient.id,
    patientName: getPatientFullName(entry.patient, UNKNOWN_PATIENT_NAME),
    status: entry.status,
    startTime: entry.scheduledTime ?? null,
    chiefComplaint,
    type,
    tokenNumber: entry.tokenNumber,
    tokenType: entry.tokenType,
    visitSummary: getOpdQueueSummaryLine({
      tokenType: entry.tokenType,
      appointment: { chiefComplaint, type: type ?? "" },
    }),
    kind: today ? entry.type : appointment ? "appointment" : "queue",
    createdAt: entry.createdAt,
    patient: entry.patient,
  };
}

export function useConsultationDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const userRole = user?.role ?? "";

  /* ── Today's queue + rollup ─────────────────────────── */
  const todayQuery = useQuery({
    queryKey: ["consultation", "today"],
    queryFn: consultationDashboardApi.getToday,
    enabled: isAuthenticated,
  });

  /* ── Active queue / OPD rows ────────────────────────── */
  const queueQuery = useQuery({
    queryKey: ["consultation", "queue"],
    queryFn: consultationDashboardApi.getQueue,
    enabled: isAuthenticated,
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
  const today = todayQuery.data;
  const queueRows = queueQuery.data;
  const stats: ConsultationDashboardStats = {
    scheduledToday: today?.stats.scheduled ?? 0,
    waiting: today?.stats.waiting ?? 0,
    inProgress: today?.stats.inProgress ?? 0,
    completed: today?.stats.completed ?? 0,
  };

  const isLoading = todayQuery.isLoading || queueQuery.isLoading;
  const isError = todayQuery.isError || queueQuery.isError;

  const refetch = useCallback(() => {
    void todayQuery.refetch();
    void queueQuery.refetch();
  }, [todayQuery, queueQuery]);

  return {
    opdQueueRows: (queueRows ?? []).map(toQueueRow),
    stats,
    // `doctorNowNext` is derived from the same queue data the rest of the
    // dashboard renders, rather than a bespoke endpoint that could drift from
    // it — and that endpoint did not exist server-side.
    doctorNowNext: {
      mode: CONSULTATION_NOW_NEXT_MODE,
      inProgress: (queueRows ?? [])
        .filter((row) => row.status === "IN_PROGRESS")
        .map(toQueueRow),
      combinedUpcoming: (today?.patients ?? [])
        .filter((entry) => entry.status === "WAITING")
        .map(toQueueRow),
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
