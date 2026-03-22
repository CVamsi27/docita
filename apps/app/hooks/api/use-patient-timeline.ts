import { useAPIMutation, useAPIQuery } from "@/lib/api-core";
import type { PatientTimelineResponse, PatientSnapshot, ActiveMedication, MedicationAdherenceSummary } from "@workspace/types";

export const usePatientTimeline = (
  patientId: string,
  filters?: {
    eventTypes?: string[];
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  },
) => {
  const params = new URLSearchParams();
  if (filters?.eventTypes?.length)
    params.set("eventTypes", filters.eventTypes.join(","));
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.offset) params.set("offset", String(filters.offset));
  const query = params.toString();

  return useAPIQuery<PatientTimelineResponse>(
    ["patient-timeline", patientId, filters ?? {}],
    `/patients/${patientId}/timeline${query ? `?${query}` : ""}`,
    { enabled: !!patientId },
  );
};

export const usePatientSnapshot = (patientId: string) =>
  useAPIQuery<PatientSnapshot>(
    ["patient-snapshot", patientId],
    `/patients/${patientId}/timeline/snapshot`,
    { enabled: !!patientId },
  );

export const useActiveMedications = (patientId: string) =>
  useAPIQuery<ActiveMedication[]>(
    ["active-medications", patientId],
    `/patients/${patientId}/medication-doses/active-medications`,
    { enabled: !!patientId },
  );

export const useMedicationAdherence = (
  patientId: string,
  prescriptionId?: string,
) => {
  const params = prescriptionId
    ? `?prescriptionId=${prescriptionId}`
    : "";
  return useAPIQuery<MedicationAdherenceSummary>(
    ["medication-adherence", patientId, prescriptionId ?? ""],
    `/patients/${patientId}/medication-doses/adherence${params}`,
    { enabled: !!patientId },
  );
};

export const useUpdateDoseStatus = (patientId: string, doseId: string) =>
  useAPIMutation<
    Record<string, unknown>,
    { status?: string; takenAt?: string; notes?: string }
  >(`/patients/${patientId}/medication-doses/${doseId}`, "PATCH", {
    invalidateKeys: [
      ["medication-adherence", patientId],
      ["active-medications", patientId],
    ],
  });
