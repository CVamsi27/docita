import {
  Feature,
  type ActiveMedication,
  type MedicationAdherenceSummary,
  type PatientSnapshot,
  type PatientTimelineResponse,
} from "@workspace/types";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";
import { useAPIMutation, useAPIQuery } from "@/lib/api/api-core";

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
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);

  return useAPIQuery<PatientTimelineResponse>(
    queryKeys.patientTimeline.list(patientId, filters ?? {}),
    `/patients/${patientId}/timeline${query ? `?${query}` : ""}`,
    { enabled: tierPatientsOk && !!patientId },
  );
};

export const usePatientSnapshot = (patientId: string) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useAPIQuery<PatientSnapshot>(
    queryKeys.patientSnapshot.detail(patientId),
    `/patients/${patientId}/timeline/snapshot`,
    { enabled: tierPatientsOk && !!patientId },
  );
};

export const useActiveMedications = (patientId: string) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useAPIQuery<ActiveMedication[]>(
    queryKeys.medications.active(patientId),
    `/patients/${patientId}/medication-doses/active-medications`,
    { enabled: tierPatientsOk && !!patientId },
  );
};

export const useMedicationAdherence = (
  patientId: string,
  prescriptionId?: string,
) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  const params = prescriptionId
    ? `?prescriptionId=${prescriptionId}`
    : "";
  return useAPIQuery<MedicationAdherenceSummary>(
    queryKeys.medications.adherence(patientId, prescriptionId ?? ""),
    `/patients/${patientId}/medication-doses/adherence${params}`,
    { enabled: tierPatientsOk && !!patientId },
  );
};

export const useUpdateDoseStatus = (patientId: string, doseId: string) =>
  useAPIMutation<
    Record<string, unknown>,
    { status?: string; takenAt?: string; notes?: string }
  >(`/patients/${patientId}/medication-doses/${doseId}`, "PATCH", {
    invalidateKeys: [
      queryKeys.medications.adherencePrefix(patientId),
      queryKeys.medications.active(patientId),
    ],
  });
