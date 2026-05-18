"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/api-client";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
import { Appointment, Document, Feature, PatientWithMedicalHistory } from "@workspace/types";
import { getUserFacingErrorMessage } from "@workspace/utils";

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
  appointments: Appointment[];
  documents: Document[];
  statistics: PatientStatistics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePatientData(patientId: string): UsePatientDataReturn {
  const tierPatientOk = useTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  const tierCalendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const tierDocsOk = useTierFeatureEnabled(Feature.DOCUMENT_ARCHIVAL);

  const [patient, setPatient] = useState<PatientWithMedicalHistory | null>(
    null,
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [statistics, setStatistics] = useState<PatientStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPatientData = useCallback(async () => {
    if (!patientId) {
      setPatient(null);
      setAppointments([]);
      setDocuments([]);
      setStatistics(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (!tierPatientOk) {
      setPatient(null);
      setAppointments([]);
      setDocuments([]);
      setStatistics(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [patientData, appointmentsData, documentsData] =
        await Promise.all([
          apiFetch<PatientWithMedicalHistory>(`/patients/${patientId}`),
          tierCalendarOk
            ? apiFetch<{ items: Appointment[] }>(
                `/appointments?patientId=${patientId}&limit=100`,
              )
            : Promise.resolve({ items: [] as Appointment[] }),
          tierDocsOk
            ? apiFetch<Document[]>(
                `/medical-documents?patientId=${patientId}`,
              )
            : Promise.resolve([] as Document[]),
        ]);

      if (
        patientData &&
        !("error" in patientData) &&
        !("statusCode" in patientData)
      ) {
        setPatient(patientData);
      } else {
        setPatient(null);
        setError("We could not open this patient record. Please try again.");
      }

      const apptItems =
        appointmentsData &&
        typeof appointmentsData === "object" &&
        "items" in appointmentsData
          ? (appointmentsData as { items: Appointment[] }).items
          : Array.isArray(appointmentsData)
            ? appointmentsData
            : [];
      const uniqueAppointments = Array.from(
        new Map(apptItems.map((item) => [item.id, item])).values(),
      );
      setAppointments(uniqueAppointments);

      if (Array.isArray(documentsData)) {
        setDocuments(documentsData);
      } else {
        setDocuments([]);
      }

      const totalVisits = uniqueAppointments.filter(
        (a) => a.status === "completed",
      ).length;
      const lastVisitDate =
        uniqueAppointments
          .filter((a) => a.status === "completed")
          .sort(
            (a, b) =>
              new Date(b.startTime ?? 0).getTime() -
              new Date(a.startTime ?? 0).getTime(),
          )[0]?.startTime ?? null;
      const nextVisitDate =
        uniqueAppointments
          .filter(
            (a) =>
              a.status === "scheduled" &&
              new Date(a.startTime ?? 0) > new Date(),
          )
          .sort(
            (a, b) =>
              new Date(a.startTime ?? 0).getTime() -
              new Date(b.startTime ?? 0).getTime(),
          )[0]?.startTime ?? null;
      setStatistics({
        totalVisits,
        lastVisit: lastVisitDate ? String(lastVisitDate) : null,
        nextVisit: nextVisitDate ? String(nextVisitDate) : null,
        adherenceRate: 0,
        totalAppointments: uniqueAppointments.length,
        scheduledAppointments: uniqueAppointments.filter(
          (a) => a.status === "scheduled",
        ).length,
        noShowCount: uniqueAppointments.filter((a) => a.status === "no-show")
          .length,
        cancelledCount: uniqueAppointments.filter(
          (a) => a.status === "cancelled",
        ).length,
      });
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallback: "We could not open this patient record. Please try again.",
          context: "load",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [patientId, tierPatientOk, tierCalendarOk, tierDocsOk]);

  useEffect(() => {
    void loadPatientData();
  }, [loadPatientData]);

  return {
    patient,
    appointments,
    documents,
    statistics,
    loading,
    error,
    refetch: loadPatientData,
  };
}
