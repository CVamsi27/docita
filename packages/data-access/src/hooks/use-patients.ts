import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { APIRequestError } from "../lib/errors";
import { queryKeys } from "../lib/query-keys-clinician";
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
  type AbhaRequestOtpResult,
  type AbhaVerificationResult,
  type VerifyAbhaRequest,
  verifyAbhaRequestSchema,
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

export type VerifyPatientAbhaVariables = VerifyAbhaRequest & {
  patientId: string;
};

export type RequestAbhaOtpVariables = {
  patientId: string;
  mobile: string;
};

export type VerifyAbhaOtpVariables = {
  patientId: string;
  txnId: string;
  otp: string;
};

export const usePatients = (options?: UsePatientsOptions) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );
  const limit = options?.limit ?? 20;
  const page = options?.page ?? 1;
  const enabled =
    options !== null && tierPatientsOk && (options?.enabled ?? true);
  const url = withQueryString("/patients", {
    limit,
    page,
    search: options?.search,
  });

  // Wire shape is the API's `listPatientsResponseSchema` (`items` + `total`);
  // the app view type for a row is the wider `Patient`.
  return useAPIQuery<{ items: Patient[]; total: number }>(
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
  type PatientsPage = {
    items: Patient[];
    nextCursor?: string;
    hasMore: boolean;
    count: number;
  };

  return useInfiniteQuery<
    PatientsPage,
    APIRequestError,
    PatientsPage,
    ReturnType<typeof queryKeys.patients.infinite>,
    string | undefined
  >({
    queryKey: queryKeys.patients.infinite(options?.search),
    queryFn: ({ pageParam }) => {
      return fetcher<PatientsPage>(
        withQueryString("/patients", {
          limit: options?.limit,
          search: options?.search,
          cursor: pageParam,
        }),
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    enabled: tierPatientsOk && (options?.enabled ?? true),
  });
};

export const useRecentPatients = (limit: number = 5) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );
  return useAPIQuery<{ items: Patient[]; total: number }>(
    queryKeys.patients.recent(limit),
    withQueryString("/patients", { limit }),
    {
      enabled: tierPatientsOk,
    },
  );
};

export const usePatient = (id: string) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );
  return useAPIQuery<Patient>(queryKeys.patients.byId(id), `/patients/${id}`, {
    enabled: tierPatientsOk && !!id,
  });
};

export const usePatientWithMedicalHistory = (id: string) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );
  return useAPIQuery<PatientWithMedicalHistory>(
    queryKeys.patients.withMedicalHistory(id),
    `/patients/${id}`,
    { enabled: tierPatientsOk && !!id },
  );
};

export const usePatientMedicalHistoryTimeline = (patientId: string) => {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );
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

function invalidatePatientQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  patientId: string,
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.patients.all() });
  queryClient.invalidateQueries({
    queryKey: queryKeys.patients.byId(patientId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.patients.withMedicalHistory(patientId),
  });
}

export const useVerifyPatientAbha = () => {
  const queryClient = useQueryClient();

  return useAPIMutation<AbhaVerificationResult, VerifyPatientAbhaVariables>(
    ({ patientId }) => `/patients/${patientId}/abha/verify`,
    "POST",
    {
      body: ({ patientId: _patientId, ...data }) =>
        verifyAbhaRequestSchema.parse(data),
      suppressGlobalErrorToast: true,
      onSuccess: (_data, variables) => {
        invalidatePatientQueries(queryClient, variables.patientId);
      },
    },
  );
};

/** M1 ABHA verification — step 1: request OTP for a mobile number. */
export const useRequestAbhaOtp = () =>
  useAPIMutation<AbhaRequestOtpResult, RequestAbhaOtpVariables>(
    ({ patientId }) => `/patients/${patientId}/abha/request-otp`,
    "POST",
    {
      body: ({ mobile }) => ({ mobile }),
      suppressGlobalErrorToast: true,
    },
  );

/** M1 ABHA verification — step 2: verify the OTP and persist the identity. */
export const useVerifyAbhaOtp = () => {
  const queryClient = useQueryClient();

  return useAPIMutation<AbhaVerificationResult, VerifyAbhaOtpVariables>(
    ({ patientId }) => `/patients/${patientId}/abha/verify-otp`,
    "POST",
    {
      body: ({ txnId, otp }) => ({ txnId, otp }),
      suppressGlobalErrorToast: true,
      onSuccess: (_data, variables) => {
        invalidatePatientQueries(queryClient, variables.patientId);
      },
    },
  );
};

export const useDeletePatient = (id: string) =>
  useAPIMutation<void, void>(`/patients/${id}`, "DELETE", {
    invalidateKeys: [queryKeys.patients.all()],
  });

export const useTodaysPatients = (doctorId?: string, search?: string) => {
  const tierQueueOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.QUEUE_MANAGEMENT,
  );
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
