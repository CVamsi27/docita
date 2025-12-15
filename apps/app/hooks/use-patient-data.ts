import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  Appointment,
  Document,
  PatientWithMedicalHistory,
} from "@workspace/types";

interface PatientStatistics {
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
  const [patient, setPatient] = useState<PatientWithMedicalHistory | null>(
    null,
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [statistics, setStatistics] = useState<PatientStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef<string | null>(null);

  const loadPatientData = useCallback(async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch patient details
      const patientData = await apiFetch<PatientWithMedicalHistory>(
        `/patients/${patientId}`,
      );

      if (
        patientData &&
        !("error" in patientData) &&
        !("statusCode" in patientData)
      ) {
        setPatient(patientData);
      } else {
        console.error("Invalid patient data:", patientData);
        setPatient(null);
        setError("Failed to load patient details");
      }

      // Fetch appointments
      const appointmentsData = await apiFetch<Appointment[]>(
        `/patients/${patientId}/appointments`,
      );

      if (Array.isArray(appointmentsData)) {
        // Deduplicate by ID
        const uniqueAppointments = Array.from(
          new Map(appointmentsData.map((item) => [item.id, item])).values(),
        );
        setAppointments(uniqueAppointments);
      } else {
        console.error("Invalid appointments data:", appointmentsData);
        setAppointments([]);
      }

      // Fetch documents
      const documentsData = await apiFetch<Document[]>(
        `/patients/${patientId}/documents`,
      );

      if (Array.isArray(documentsData)) {
        setDocuments(documentsData);
      } else {
        console.error("Invalid documents data:", documentsData);
        setDocuments([]);
      }

      // Fetch patient statistics
      const statisticsData = await apiFetch<PatientStatistics>(
        `/patients/${patientId}/statistics`,
      );

      if (
        statisticsData &&
        typeof statisticsData === 'object' &&
        !("error" in statisticsData) &&
        !("statusCode" in statisticsData) &&
        "totalVisits" in statisticsData
      ) {
        setStatistics(statisticsData);
      } else {
        console.error("Invalid statistics data:", statisticsData);
        // Set default statistics instead of null
        setStatistics({
          totalVisits: 0,
          lastVisit: null,
          nextVisit: null,
          adherenceRate: 0,
          totalAppointments: 0,
          scheduledAppointments: 0,
          noShowCount: 0,
          cancelledCount: 0,
        });
      }
    } catch (err) {
      console.error("Failed to load patient data:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while fetching data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Use useSyncExternalStore to trigger fetch when patientId changes
  useSyncExternalStore(
    useCallback(() => {
      if (patientId && hasFetchedRef.current !== patientId) {
        hasFetchedRef.current = patientId;
        loadPatientData();
      }
      return () => {};
    }, [patientId, loadPatientData]),
    () => patient,
    () => null,
  );

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
