"use client";

import type {
  Appointment,
  Document,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { apiFetch } from "@/lib/api/api-client";

export function fetchPatientWithMedicalHistory(
  patientId: string,
): Promise<PatientWithMedicalHistory> {
  return apiFetch<PatientWithMedicalHistory>(`/patients/${patientId}`);
}

export function fetchPatientAppointments(
  patientId: string,
  limit = 100,
): Promise<{ items: Appointment[] }> {
  return apiFetch<{ items: Appointment[] }>(
    `/appointments?patientId=${patientId}&limit=${limit}`,
  );
}

export function fetchPatientDocuments(patientId: string): Promise<Document[]> {
  return apiFetch<Document[]>(`/medical-documents?patientId=${patientId}`);
}
