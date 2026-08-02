import { useMemo } from "react";
import { usePatientAppointments, usePatientWithMedicalHistory } from "@workspace/data-access";
import {
  AppointmentListItemContractResponse,
  PatientWithMedicalHistory,
} from "@workspace/types";

export interface PatientStatistics {
  totalVisits: number;
  lastVisit: string | null;
  nextVisit: string | null;
  adherenceRate: number;
  totalAppointments: number;
  scheduledAppointments: number;
  noShowCount: number;
  cancelledCount: number;
}

interface UsePatientDataReturn {
  patient: PatientWithMedicalHistory | null;
  appointments: AppointmentListItemContractResponse[];
  documents: never[];
  statistics: PatientStatistics | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function toDate(value: string | Date | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function computeStatistics(
  appointments: AppointmentListItemContractResponse[],
): PatientStatistics {
  const completed = appointments.filter((a) => a.status === "completed");
  const sorted = [...completed].sort(
    (a, b) =>
      (toDate(b.startTime)?.getTime() ?? 0) -
      (toDate(a.startTime)?.getTime() ?? 0),
  );
  const next = appointments
    .filter(
      (a) =>
        a.status === "scheduled" ||
        a.status === "confirmed" ||
        a.status === "checked-in",
    )
    .sort(
      (a, b) =>
        (toDate(a.startTime)?.getTime() ?? 0) -
        (toDate(b.startTime)?.getTime() ?? 0),
    )[0];
  return {
    totalVisits: completed.length,
    lastVisit: sorted[0]?.startTime ? String(sorted[0].startTime) : null,
    nextVisit: next?.startTime ? String(next.startTime) : null,
    adherenceRate: 0,
    totalAppointments: appointments.length,
    scheduledAppointments: appointments.filter(
      (a) => a.status === "scheduled" || a.status === "confirmed",
    ).length,
    noShowCount: appointments.filter((a) => a.status === "no-show").length,
    cancelledCount: appointments.filter((a) => a.status === "cancelled").length,
  };
}

export function usePatientData(patientId: string): UsePatientDataReturn {
  const patientQuery = usePatientWithMedicalHistory(patientId);
  const appointmentsQuery = usePatientAppointments(patientId);

  const patient = patientQuery.data ?? null;
  // The appointments list endpoint returns schema-validated list items; the
  // detail surface only reads id/startTime/status/vitalSign, all present on
  // the list-item contract, so consumers are typed against that shape.
  const appointments = appointmentsQuery.data?.items ?? [];
  const loading = patientQuery.isLoading || appointmentsQuery.isLoading;
  const error = patientQuery.error?.message ?? appointmentsQuery.error?.message ?? null;
  const refetch = () => {
    void patientQuery.refetch();
    void appointmentsQuery.refetch();
  };

  const statistics = useMemo(() => computeStatistics(appointments), [appointments]);

  return {
    patient,
    appointments,
    documents: [],
    statistics,
    loading,
    error,
    refetch,
  };
}
