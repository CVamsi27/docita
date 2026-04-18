import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@workspace/data-access";
import {
  Appointment,
  AppointmentCancelRequest,
  CreateAppointmentRequest,
  Patient,
  UpdateAppointmentRequest,
} from "@workspace/types";
import {
  fetchAPI,
  PaginatedResponse,
  useAPIMutation,
  useAPIQuery,
} from "@/lib/api-core";
import { withQueryString } from "@/lib/http/query-string";

export type AppointmentWithRelations = Appointment & {
  patient?: Patient;
  doctor?: { id?: string; name?: string | null } | null;
};

export interface QueueItem {
  id: string;
  clinicId: string;
  patientId: string;
  appointmentId?: string;
  doctorId?: string;
  tokenNumber: number;
  status: string;
  priority: number;
  notes?: string;
  calledAt?: string;
  completedAt?: string;
  createdAt: string;
  tokenType: "scheduled" | "walk-in" | "late-arrival";
  scheduledTime?: string;
  estimatedDuration: number;
  consultationStart?: string;
  estimatedWaitTime?: number;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  doctor?: { id: string; name: string };
  appointment?: { id: string; doctor: { id: string; name: string } };
}

export interface StartConsultationResponse {
  appointmentId: string;
  status: string;
}

type AppointmentQueryOptions = {
  date?: string;
  startDate?: string;
  endDate?: string;
  doctorId?: string;
  search?: string;
  status?: string;
  cursor?: string;
  limit?: number;
};

const normalizeAppointmentQueryOptions = (
  options?: AppointmentQueryOptions | null,
): AppointmentQueryOptions | undefined => {
  if (!options) {
    return undefined;
  }

  const normalizedEntries = Object.entries(options).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );

  return Object.fromEntries(normalizedEntries) as AppointmentQueryOptions;
};

export const useAppointments = (
  options?: AppointmentQueryOptions | null,
) => {
  const normalizedOptions = normalizeAppointmentQueryOptions(options);
  const url = withQueryString("/appointments", normalizedOptions);

  return useAPIQuery<PaginatedResponse<AppointmentWithRelations>>(
    queryKeys.appointments.list(normalizedOptions),
    url,
    { enabled: options !== null, placeholderData: keepPreviousData },
  );
};

export const useTodayAppointments = (enabled: boolean = true) => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(now.getTime() - offsetMs);
  const today = localDate.toISOString().split("T")[0] ?? "";
  return useAPIQuery<PaginatedResponse<AppointmentWithRelations>>(
    queryKeys.appointments.list({ date: today }),
    `/appointments?date=${today}`,
    { enabled },
  );
};

export const useAppointment = (id: string) =>
  useAPIQuery<AppointmentWithRelations>(
    queryKeys.appointments.detail(id),
    `/appointments/${id}`,
  );

export const usePatientAppointments = (patientId: string) =>
  useAPIQuery<PaginatedResponse<AppointmentWithRelations>>(
    queryKeys.appointments.byPatient(patientId),
    `/appointments?patientId=${patientId}`,
    { enabled: !!patientId },
  );

export const useCreateAppointment = () =>
  useAPIMutation<Appointment, CreateAppointmentRequest>(
    "/appointments",
    "POST",
    {
      invalidateKeys: [queryKeys.appointments.all()],
    },
  );

export const useUpdateAppointment = (id: string) =>
  useAPIMutation<Appointment, UpdateAppointmentRequest>(
    `/appointments/${id}`,
    "PATCH",
    {
      invalidateKeys: [
        queryKeys.appointments.all(),
        queryKeys.appointments.detail(id),
      ],
    },
  );

export const useCancelAppointment = (id: string) =>
  useAPIMutation<Appointment, AppointmentCancelRequest>(
    `/appointments/${id}/cancel`,
    "PATCH",
    {
      invalidateKeys: [
        queryKeys.appointments.all(),
        queryKeys.appointments.detail(id),
      ],
    },
  );

export const useStartConsultation = () =>
  useAPIMutation<StartConsultationResponse, { appointmentId: string }>(
    ({ appointmentId }) => `/appointments/${appointmentId}/start-consultation`,
    "POST",
    {
      invalidateKeys: [queryKeys.appointments.all(), queryKeys.queue.all()],
    },
  );

export interface DiagnosisSyncItem {
  icdCodeId?: string;
  notes?: string;
  isPrimary?: boolean;
}

export interface DiagnosesSyncRequestBody {
  diagnoses: DiagnosisSyncItem[];
  contentHash?: string;
}

export interface DiagnosesSyncResponse {
  success: boolean;
  contentHash?: string;
  skipped?: boolean;
  count?: number;
}

export const useSyncDiagnoses = (appointmentId: string) =>
  useAPIMutation<DiagnosesSyncResponse, DiagnosesSyncRequestBody>(
    `/appointments/${appointmentId}/diagnoses`,
    "POST",
    {
      invalidateKeys: [
        queryKeys.appointments.detail(appointmentId),
        ["coding-queue"],
      ],
    },
  );

export const useInfiniteAppointments = (options?: {
  limit?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) => {
  const normalizedOptions = normalizeAppointmentQueryOptions(options);

  return useInfiniteQuery({
    queryKey: queryKeys.appointments.infinite(normalizedOptions),
    queryFn: ({ pageParam }) => {
      return fetchAPI<PaginatedResponse<Appointment & { patient?: Patient }>>(
        withQueryString("/appointments", {
          ...normalizedOptions,
          limit: options?.limit ?? 50,
          cursor: pageParam as string | undefined,
        }),
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    staleTime: 1000 * 60 * 2,
  });
};

export const useCheckInAppointment = () =>
  useAPIMutation<{ success: boolean }, string>(
    (id) => `/queue/check-in/${id}`,
    "POST",
    {
      invalidateKeys: [queryKeys.queue.all(), queryKeys.appointments.all()],
    },
  );

export const useQueue = (options?: { search?: string }) => {
  const params = options?.search ? { search: options.search } : undefined;
  return useAPIQuery<QueueItem[]>(
    queryKeys.queue.list(params),
    withQueryString("/queue", {
      search: options?.search,
    }),
  );
};

export const useQueueByDoctor = (
  doctorId?: string,
  search?: string,
  enabled: boolean = true,
) => {
  const params =
    doctorId || search
      ? {
          doctorId: doctorId ?? "all",
          search: search ?? "",
        }
      : undefined;
  return useAPIQuery<QueueItem[]>(
    queryKeys.queue.list(params),
    withQueryString("/queue", { doctorId, search }),
    { enabled },
  );
};

export const useCallPatient = () =>
  useAPIMutation<QueueItem, string>(
    (queueId) => `/queue/call/${queueId}`,
    "POST",
    {
      invalidateKeys: [queryKeys.queue.all()],
    },
  );

export const useCompletePatient = () =>
  useAPIMutation<QueueItem, string>(
    (queueId) => `/queue/complete/${queueId}`,
    "POST",
    {
      invalidateKeys: [queryKeys.queue.all()],
    },
  );

export const useResetQueue = () =>
  useAPIMutation<{ success: boolean }, void>("/queue/reset", "POST", {
    invalidateKeys: [queryKeys.queue.all()],
  });
