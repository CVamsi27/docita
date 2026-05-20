import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import {
  CreatePatientRequest,
  Feature,
  Patient,
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalCondition,
  PatientSocialHistory,
  PatientSurgicalHistory,
  PatientWithMedicalHistory,
  UpdatePatientRequest,
} from "@workspace/types";
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
import { withQueryString } from "../lib/query-string";
import { useDataAccessContext } from "../provider/hooks";
import type { MedicalHistoryTimelineItem } from "../types/app-types";
type UsePatientsOptions = {
  limit?: number;
  page?: number;
  search?: string;
  enabled?: boolean;
} | null;

export const usePatients = (options?: UsePatientsOptions) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  const limit = options?.limit ?? 20;
  const page = options?.page ?? 1;
  const enabled =
    options !== null &&
    tierPatientsOk &&
    (options?.enabled ?? true);
  const url = withQueryString("/patients", {
    limit,
    page,
    search: options?.search,
  });

  return useAPIQuery<{
    items: Patient[];
    nextCursor?: string;
    hasMore: boolean;
    count: number;
  }>(
    queryKeys.patients.list({
      limit,
      page,
      search: options?.search ?? "",
    }),
    url,
    { enabled, gcTime: 5 * 60 * 1000 },
  );
};

export const useInfinitePatients = (options?: {
  limit?: number;
  search?: string;
  enabled?: boolean;
}) => {
  const { fetcher, isTierFeatureEnabled } = useDataAccessContext();
  const tierPatientsOk = isTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useInfiniteQuery({
    queryKey: queryKeys.patients.infinite(options?.search),
    queryFn: ({ pageParam }) => {
      return fetcher<{
        items: Patient[];
        nextCursor?: string;
        hasMore: boolean;
        count: number;
      }>(
        withQueryString("/patients", {
          limit: options?.limit,
          search: options?.search,
          cursor: pageParam as string | undefined,
        }),
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: tierPatientsOk && (options?.enabled ?? true),
  });
};

export const useRecentPatients = (limit: number = 5) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useAPIQuery<{
    items: Patient[];
    nextCursor?: string;
    hasMore: boolean;
    count: number;
  }>(queryKeys.patients.recent(limit), withQueryString("/patients", { limit }), {
    enabled: tierPatientsOk,
  });
};

export const usePatient = (id: string) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useAPIQuery<Patient>(queryKeys.patients.byId(id), `/patients/${id}`, {
    enabled: tierPatientsOk && !!id,
  });
};

export const usePatientWithMedicalHistory = (id: string) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useAPIQuery<PatientWithMedicalHistory>(
    queryKeys.patients.withMedicalHistory(id),
    `/patients/${id}`,
    { enabled: tierPatientsOk && !!id },
  );
};

export const usePatientMedicalHistoryTimeline = (patientId: string) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useAPIQuery<MedicalHistoryTimelineItem[]>(
    queryKeys.patients.medicalHistoryTimeline(patientId),
    `/patients/${patientId}/medical-history-timeline`,
    { enabled: tierPatientsOk && !!patientId },
  );
};

export type PatientMedicalHistoryFull = {
  conditions?: PatientMedicalCondition[];
  allergies?: PatientAllergy[];
  familyHistory?: PatientFamilyHistory[];
  socialHistory?: PatientSocialHistory | null;
  surgicalHistory?: PatientSurgicalHistory[];
};

export const usePatientMedicalHistoryFull = (patientId: string) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );
  return useAPIQuery<PatientMedicalHistoryFull>(
    queryKeys.patients.medicalHistoryFull(patientId),
    `/patients/${patientId}/medical-history`,
    { enabled: tierPatientsOk && !!patientId },
  );
};

export const useCreatePatient = () =>
  useAPIMutation<Patient, CreatePatientRequest>("/patients", "POST", {
    invalidateKeys: [queryKeys.patients.all()],
    suppressGlobalErrorToast: true,
  });

export const useUpdatePatient = (id: string) =>
  useAPIMutation<Patient, UpdatePatientRequest>(`/patients/${id}`, "PATCH", {
    invalidateKeys: [queryKeys.patients.all(), queryKeys.patients.byId(id)],
    suppressGlobalErrorToast: true,
  });

export const useDeletePatient = (id: string) =>
  useAPIMutation<void, void>(`/patients/${id}`, "DELETE", {
    invalidateKeys: [queryKeys.patients.all()],
  });

export const useTodaysPatients = (doctorId?: string, search?: string) => {
  const tierQueueOk = useDataAccessContext().isTierFeatureEnabled(Feature.QUEUE_MANAGEMENT);
  return useAPIQuery<{
    patients: {
      id: string;
      type: "appointment" | "queue";
      tokenNumber: number | null;
      tokenType: "scheduled" | "walk-in" | "late-arrival" | "pending";
      status: string;
      priority: number;
      scheduledTime: string | null;
      checkInTime: string | null;
      patient: {
        id: string;
        firstName: string;
        lastName: string;
        phoneNumber: string | null;
        gender: string | null;
        dateOfBirth: string | null;
      };
      doctor: { id: string; name: string } | null;
      appointmentId: string | null;
      appointmentType: string | null;
      estimatedWaitTime: number | null;
      calledAt: string | null;
      completedAt: string | null;
      createdAt: string;
    }[];
    stats: {
      total: number;
      pending: number;
      waiting: number;
      inProgress: number;
      completed: number;
      noShow: number;
      walkIns: number;
      scheduled: number;
      avgConsultationMinutes: number;
    };
  }>(
    queryKeys.patients.todays(doctorId ?? "all", search ?? ""),
    withQueryString("/queue/today", { doctorId, search }),
    { enabled: tierQueueOk },
  );
};
