import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@workspace/data-access";
import {
  Appointment,
  AppointmentRequestListResponse,
  AppointmentRequestResponse,
  ApproveAppointmentRequest,
  BookFollowUpRequest,
  AppointmentCancelRequest,
  AppointmentListItemContractResponse,
  CreateAppointmentRequest,
  Feature,
  FollowUpResponse,
  ListAppointmentRequestsQuery,
  ListFollowUpsQuery,
  Patient,
  listAppointmentsResponseSchema,
  RejectAppointmentRequest,
  StartConsultationResponse,
  UpdateAppointmentRequest,
} from "@workspace/types";
import {
  fetchAPI,
  useAPIMutation,
  useAPIQuery,
  useAPIQueryValidated,
} from "@/lib/api-core";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";
import { withQueryString, type QueryParams } from "@/lib/http/query-string";
import {
  DEFAULT_TIMEZONE,
  formatClinicTodayPickerIso,
} from "@workspace/utils";
import { useClinic } from "@/lib/clinic-context";

export type AppointmentListItem = AppointmentListItemContractResponse;

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
  appointment?: {
    id: string;
    doctor: { id: string; name: string };
    type?: string | null;
    chiefComplaint?: string | null;
  };
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
  return normalizeQueryOptions(options);
};

const normalizeQueryOptions = <T extends QueryParams>(
  options?: T | null,
): T | undefined => {
  if (!options) {
    return undefined;
  }

  const normalizedEntries = Object.entries(options).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );

  return Object.fromEntries(normalizedEntries) as T;
};

export const useAppointments = (options?: AppointmentQueryOptions | null) => {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const normalizedOptions = normalizeAppointmentQueryOptions(options);
  const url = withQueryString("/appointments", normalizedOptions);

  return useAPIQueryValidated(
    queryKeys.appointments.list(normalizedOptions),
    url,
    listAppointmentsResponseSchema,
    {
      enabled: calendarOk && options !== null,
      placeholderData: keepPreviousData,
    },
  );
};

export const useTodayAppointments = (enabled: boolean = true) => {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const { clinic } = useClinic();
  const tz = clinic?.timezone?.trim() || DEFAULT_TIMEZONE;
  const today = formatClinicTodayPickerIso(tz);
  return useAPIQueryValidated(
    queryKeys.appointments.list({ date: today }),
    `/appointments?date=${today}`,
    listAppointmentsResponseSchema,
    { enabled: calendarOk && enabled },
  );
};

export const useAppointment = (id: string) => {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  return useAPIQuery<AppointmentWithRelations>(
    queryKeys.appointments.detail(id),
    `/appointments/${id}`,
    { enabled: calendarOk && id.length > 0 },
  );
};

export const usePatientAppointments = (patientId: string) => {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  return useAPIQueryValidated(
    queryKeys.appointments.byPatient(patientId),
    `/appointments?patientId=${patientId}`,
    listAppointmentsResponseSchema,
    { enabled: calendarOk && !!patientId },
  );
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  return useAPIMutation<Appointment, CreateAppointmentRequest>(
    "/appointments",
    "POST",
    {
      invalidateKeys: [
        queryKeys.appointments.all(),
        ["doctor-availability-slots"],
      ],
      onSuccess: async () => {
        await queryClient.refetchQueries({
          queryKey: ["doctor-availability-slots"],
          type: "all",
        });
      },
      suppressGlobalErrorToast: true,
    },
  );
};

export const useUpdateAppointment = (id: string) =>
  useAPIMutation<Appointment, UpdateAppointmentRequest>(
    `/appointments/${id}`,
    "PATCH",
    {
      invalidateKeys: [
        queryKeys.appointments.all(),
        queryKeys.appointments.detail(id),
        ["doctor-availability-slots"],
      ],
      suppressGlobalErrorToast: true,
    },
  );

/** Background consultation draft saves: avoids invalidating detail (prevents refetch/hydrate churn). */
export const useConsultationAutosaveUpdateAppointment = (id: string) =>
  useAPIMutation<Appointment, UpdateAppointmentRequest>(
    `/appointments/${id}`,
    "PATCH",
    {
      invalidateKeys: [],
      suppressGlobalErrorToast: true,
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
        ["doctor-availability-slots"],
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
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);

  return useInfiniteQuery({
    queryKey: queryKeys.appointments.infinite(normalizedOptions),
    queryFn: ({ pageParam }) => {
      return fetchAPI(
        withQueryString("/appointments", {
          ...normalizedOptions,
          limit: options?.limit ?? 50,
          cursor: pageParam as string | undefined,
        }),
      ).then((data) => listAppointmentsResponseSchema.parse(data));
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    staleTime: 1000 * 60 * 2,
    enabled: calendarOk,
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

export const useFollowUps = (options?: ListFollowUpsQuery | null) => {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const normalizedOptions = normalizeAppointmentQueryOptions(options);
  return useAPIQuery<FollowUpResponse[]>(
    ["follow-ups", normalizedOptions ?? {}],
    withQueryString("/follow-ups", normalizedOptions),
    {
      enabled: calendarOk && options !== null,
      placeholderData: keepPreviousData,
    },
  );
};

export const useCompleteFollowUp = () =>
  useAPIMutation<FollowUpResponse, { id: string }>(
    ({ id }) => `/follow-ups/${id}/complete`,
    "PATCH",
    {
      invalidateKeys: [["follow-ups"]],
    },
  );

export const useCancelFollowUp = () =>
  useAPIMutation<FollowUpResponse, { id: string }>(
    ({ id }) => `/follow-ups/${id}/cancel`,
    "PATCH",
    {
      invalidateKeys: [["follow-ups"]],
    },
  );

export const useBookFollowUp = () =>
  useAPIMutation<FollowUpResponse, BookFollowUpRequest & { id: string }>(
    ({ id }) => `/follow-ups/${id}/book`,
    "PATCH",
    {
      invalidateKeys: [["follow-ups"], queryKeys.appointments.all()],
    },
  );

export const useAppointmentRequests = (
  options?: ListAppointmentRequestsQuery | null,
) => {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const normalizedOptions = normalizeAppointmentQueryOptions(options);
  return useAPIQuery<AppointmentRequestListResponse>(
    ["appointment-requests", normalizedOptions ?? {}],
    withQueryString("/appointment-requests", normalizedOptions),
    {
      enabled: calendarOk && options !== null,
      placeholderData: keepPreviousData,
    },
  );
};

export const useApproveAppointmentRequest = () =>
  useAPIMutation<
    AppointmentRequestResponse,
    ApproveAppointmentRequest & { id: string }
  >(({ id }) => `/appointment-requests/${id}/approve`, "PATCH", {
    invalidateKeys: [
      ["appointment-requests"],
      queryKeys.appointments.all(),
      ["patient-portal", "appointments"],
      ["doctor-availability-slots"],
    ],
  });

export const useRejectAppointmentRequest = () =>
  useAPIMutation<
    AppointmentRequestResponse,
    RejectAppointmentRequest & { id: string }
  >(({ id }) => `/appointment-requests/${id}/reject`, "PATCH", {
    invalidateKeys: [["appointment-requests"]],
  });

export const useQueue = (options?: { search?: string }) => {
  const queueOk = useTierFeatureEnabled(Feature.QUEUE_MANAGEMENT);
  const params = options?.search ? { search: options.search } : undefined;
  return useAPIQuery<QueueItem[]>(
    queryKeys.queue.list(params),
    withQueryString("/queue", {
      search: options?.search,
    }),
    { enabled: queueOk },
  );
};

export const useQueueByDoctor = (
  doctorId?: string,
  search?: string,
  enabled: boolean = true,
) => {
  const queueOk = useTierFeatureEnabled(Feature.QUEUE_MANAGEMENT);
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
    { enabled: queueOk && enabled },
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
