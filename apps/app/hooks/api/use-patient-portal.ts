import { useAPIMutation, useAPIQuery } from "@/lib/api-core";
import type {
  ActiveMedication,
  AppointmentRequestResponse,
  MedicationAdherenceSummary,
  PatientAppointmentRequestCreate,
  PatientSnapshot,
  PatientTimelineResponse,
} from "@workspace/types";

interface UpdatePatientProfileBodyDto {
  phoneNumber?: string;
  email?: string;
  address?: string;
  whatsappConsent?: boolean;
}

export const usePatientPortalDashboard = () =>
  useAPIQuery<{
    patient: Record<string, unknown>;
    summary: {
      upcomingAppointmentsCount: number;
      activePrescriptionsCount: number;
      outstandingInvoicesCount: number;
      totalOutstandingAmount: number;
    };
    upcomingAppointments: Record<string, unknown>[];
    activePrescriptions: Record<string, unknown>[];
    outstandingInvoices: Record<string, unknown>[];
  }>(["patient-portal", "dashboard"], "/patient-portal/dashboard");

export const usePatientPortalAppointments = (filters?: {
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) =>
  useAPIQuery<{
    appointments: Record<string, unknown>[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>(
    ["patient-portal", "appointments", filters || {}],
    "/patient-portal/appointments",
  );

export const usePatientPortalAppointmentById = (appointmentId: string) =>
  useAPIQuery(
    ["patient-portal", "appointments", appointmentId],
    `/patient-portal/appointments/${appointmentId}`,
    {
      enabled: !!appointmentId,
    },
  );

export const useRequestAppointment = () =>
  useAPIMutation<AppointmentRequestResponse, PatientAppointmentRequestCreate>(
    "/patient-portal/appointments/request",
    "POST",
    {
      invalidateKeys: [["patient-portal", "appointments"]],
      suppressGlobalErrorToast: true,
    },
  );

export const usePatientPortalPrescriptions = (filters?: {
  limit?: number;
  offset?: number;
}) =>
  useAPIQuery<{
    prescriptions: Record<string, unknown>[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>(
    ["patient-portal", "prescriptions", filters || {}],
    "/patient-portal/prescriptions",
  );

export const usePatientPortalPrescriptionById = (prescriptionId: string) =>
  useAPIQuery(
    ["patient-portal", "prescriptions", prescriptionId],
    `/patient-portal/prescriptions/${prescriptionId}`,
    {
      enabled: !!prescriptionId,
    },
  );

export const usePatientPortalInvoices = (filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}) =>
  useAPIQuery<{
    invoices: Record<string, unknown>[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>(["patient-portal", "invoices", filters || {}], "/patient-portal/invoices");

export const useUpdatePatientProfile = () =>
  useAPIMutation<Record<string, unknown>, UpdatePatientProfileBodyDto>(
    "/patient-portal/profile",
    "PATCH",
  );

export const usePatientConsentSettings = () =>
  useAPIQuery<{
    whatsappConsent: boolean;
    whatsappConsentAt: string | null;
    isFirstLogin: boolean;
    dataStorageConsent: boolean;
  }>(["patient-portal", "consent"], "/patient-portal/consent");

export const useUpdatePatientConsent = () =>
  useAPIMutation<
    Record<string, unknown>,
    { whatsappConsent?: boolean; dataStorageConsent?: boolean }
  >("/patient-portal/consent", "PATCH");

export const useRequestDataDeletion = () =>
  useAPIMutation<
    Record<string, unknown>,
    { reason: string; confirmDeletion?: boolean }
  >("/patient-portal/profile/delete-request", "POST");

export const usePatientMedicalHistory = (patientId?: string) =>
  useAPIQuery<{
    conditions: Record<string, unknown>[];
    allergies: Record<string, unknown>[];
    familyHistory: Record<string, unknown>[];
    socialHistory: Record<string, unknown> | null;
    surgicalHistory: Record<string, unknown>[];
  }>(
    ["patient-portal", "medical-history", patientId || ""],
    `/patients/${patientId}/medical-history`,
    {
      enabled: !!patientId,
    },
  );

export const usePortalMetricCategories = () =>
  useAPIQuery<Record<string, unknown>[]>(
    ["patient-portal", "metrics", "categories"],
    "/patient-portal/metrics/categories",
  );

export const usePortalMetricHistory = (filters?: {
  definitionId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (filters?.definitionId) params.set("definitionId", filters.definitionId);
  if (filters?.categoryId) params.set("categoryId", filters.categoryId);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const query = params.toString();
  return useAPIQuery<{
    total: number;
    timeline: Record<string, unknown>[];
    byCategory: Record<string, Record<string, unknown>[]>;
  }>(
    ["patient-portal", "metrics", "history", filters || {}],
    `/patient-portal/metrics/history${query ? `?${query}` : ""}`,
  );
};

export const usePortalSelectedMetrics = () =>
  useAPIQuery<Record<string, unknown>[]>(
    ["patient-portal", "metrics", "selected"],
    "/patient-portal/metrics/selected",
  );

export const useUpdatePortalSelectedMetrics = () =>
  useAPIMutation<
    Record<string, unknown>[],
    { items: Array<{ definitionId: string; isTracked: boolean }> }
  >("/patient-portal/metrics/selected", "PUT", {
    invalidateKeys: [["patient-portal", "metrics", "selected"]],
  });

export const useRecordPortalMetricValue = () =>
  useAPIMutation<
    Record<string, unknown>,
    {
      definitionId: string;
      valueString?: string;
      valueNumber?: number;
      valueBoolean?: boolean;
      valueDate?: string;
      optionId?: string;
      optionIds?: string[];
      recordedAt?: string;
      notes?: string;
    }
  >("/patient-portal/metrics/values", "POST", {
    invalidateKeys: [["patient-portal", "metrics", "history"]],
  });

export const useCreatePortalMetricDefinition = () =>
  useAPIMutation<
    Record<string, unknown>,
    {
      categoryId: string;
      key: string;
      label: string;
      valueType: string;
      unit?: string;
      isTrackedByDefault?: boolean;
    }
  >("/patient-portal/metrics/definitions", "POST", {
    invalidateKeys: [["patient-portal", "metrics", "categories"]],
  });

export const usePortalVitalsHistory = (filters?: {
  categoryId?: string;
  from?: string;
  to?: string;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (filters?.categoryId) params.set("categoryId", filters.categoryId);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const query = params.toString();
  return useAPIQuery<{
    total: number;
    timeline: Record<string, unknown>[];
    byCategory: Record<string, Record<string, unknown>[]>;
  }>(
    ["patient-portal", "metrics", "vitals-history", filters || {}],
    `/patient-portal/metrics/vitals-history${query ? `?${query}` : ""}`,
  );
};

export const usePortalTimeline = (filters?: {
  eventTypes?: string[];
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) => {
  const params = new URLSearchParams();
  if (filters?.eventTypes?.length)
    params.set("eventTypes", filters.eventTypes.join(","));
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.offset) params.set("offset", String(filters.offset));
  const query = params.toString();
  return useAPIQuery<PatientTimelineResponse>(
    ["patient-portal", "timeline", filters || {}],
    `/patient-portal/timeline${query ? `?${query}` : ""}`,
  );
};

export const usePortalSnapshot = () =>
  useAPIQuery<PatientSnapshot>(
    ["patient-portal", "timeline", "snapshot"],
    "/patient-portal/timeline/snapshot",
  );

export const usePortalActiveMedications = () =>
  useAPIQuery<ActiveMedication[]>(
    ["patient-portal", "medications", "active"],
    "/patient-portal/medications/active",
  );

export const usePortalDoseHistory = (filters?: {
  prescriptionId?: string;
  from?: string;
  to?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => {
  const params = new URLSearchParams();
  if (filters?.prescriptionId) params.set("prescriptionId", filters.prescriptionId);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.offset) params.set("offset", String(filters.offset));
  const query = params.toString();
  return useAPIQuery<{
    doses: Record<string, unknown>[];
    total: number;
    limit: number;
    offset: number;
  }>(
    ["patient-portal", "medications", "doses", filters || {}],
    `/patient-portal/medications/doses${query ? `?${query}` : ""}`,
  );
};

export const useRecordPortalDose = () =>
  useAPIMutation<
    Record<string, unknown>,
    {
      medicationId: string;
      takenAt?: string;
      status: "TAKEN" | "MISSED" | "SKIPPED";
      doseAmount?: string;
      notes?: string;
    }
  >("/patient-portal/medications/doses", "POST", {
    invalidateKeys: [
      ["patient-portal", "medications", "doses"],
      ["patient-portal", "medications", "active"],
    ],
  });

export const usePortalAdherence = (prescriptionId?: string) => {
  const query = prescriptionId ? `?prescriptionId=${prescriptionId}` : "";
  return useAPIQuery<MedicationAdherenceSummary>(
    ["patient-portal", "medications", "adherence", prescriptionId || ""],
    `/patient-portal/medications/adherence${query}`,
  );
};
