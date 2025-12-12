import { useState, useCallback, useRef, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  PatientWithMedicalHistory,
  Appointment,
  Document,
} from "@workspace/types";

interface UsePatientDataReturn {
  patient: PatientWithMedicalHistory | null;
  appointments: Appointment[];
  documents: Document[];
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
        setAppointments(appointmentsData);
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
    useCallback(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (notify) => {
        if (patientId && hasFetchedRef.current !== patientId) {
          hasFetchedRef.current = patientId;
          loadPatientData();
        }
        return () => {};
      },
      [patientId, loadPatientData],
    ),
    () => patient,
    () => null,
  );

  return {
    patient,
    appointments,
    documents,
    loading,
    error,
    refetch: loadPatientData,
  };
}
