import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys-clinician";
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
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";
import { useAPIQueryValidated } from "../core/use-api-query-validated";
import { omitEmptyQueryParams, withQueryString } from "../lib/query-string";
import { DEFAULT_TIMEZONE, formatClinicTodayPickerIso } from "@workspace/utils";
import { useDataAccessContext } from "../provider/hooks";
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
    startTime?: string;
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
  page?: number;
  sortOrder?: "asc" | "desc";
  limit?: number;
};

const normalizeAppointmentQueryOptions = (
  options?: AppointmentQueryOptions | null,
): AppointmentQueryOptions | undefined => {
  if (!options) return undefined;

  return omitEmptyQueryParams(options);
};

export const useAppointments = (options?: AppointmentQueryOptions | null) => {
  const { isTierFeatureEnabled, getClinicId } = useDataAccessContext();
  const calendarOk = isTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const normalizedOptions = normalizeAppointmentQueryOptions(options);
  const url = withQueryString("/appointments", normalizedOptions);

  return useAPIQueryValidated(
    queryKeys.appointments.list(normalizedOptions),
    url,
    listAppointmentsResponseSchema,
    {
      enabled: calendarOk && options !== null && Boolean(getClinicId()),
      placeholderData: keepPreviousData,
      // Cached snapshot is treated as stale immediately so navigating back to
      // /appointments — or flipping the calendar back to a previously-viewed
      // day — always triggers a background revalidation rather than showing a
      // stale page until the user manually refreshes or creates an entry.
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    },
  );
};

export const useTodayAppointments = (enabled: boolean = true) => {
  const { getClinicTimezone, isTierFeatureEnabled } = useDataAccessContext();
  const calendarOk = isTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const tz = getClinicTimezone()?.trim() || DEFAULT_TIMEZONE;
  const today = formatClinicTodayPickerIso(tz);
  return useAPIQueryValidated(
    queryKeys.appointments.list({ date: today }),
    `/appointments?date=${today}`,
    listAppointmentsResponseSchema,
    {
      enabled: calendarOk && enabled,
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
    },
  );
};

export const useAppointment = (id: string) => {
  const calendarOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.CALENDAR_SLOTS,
  );
  return useAPIQuery<AppointmentWithRelations>(
    queryKeys.appointments.detail(id),
    `/appointments/${id}`,
    { enabled: calendarOk && id.length > 0 },
  );
};

export const usePatientAppointments = (patientId: string) => {
  const calendarOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.CALENDAR_SLOTS,
  );
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
        queryKeys.doctorAvailabilitySlots.all(),
      ],
      onSuccess: async () => {
        await queryClient.refetchQueries({
          queryKey: queryKeys.doctorAvailabilitySlots.all(),
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
        queryKeys.doctorAvailabilitySlots.all(),
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
        queryKeys.doctorAvailabilitySlots.all(),
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
        queryKeys.codingQueue.list(),
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
  const { fetcher, isTierFeatureEnabled } = useDataAccessContext();
  const calendarOk = isTierFeatureEnabled(Feature.CALENDAR_SLOTS);

  return useInfiniteQuery<
    ReturnType<typeof listAppointmentsResponseSchema.parse>,
    Error,
    ReturnType<typeof listAppointmentsResponseSchema.parse>,
    ReturnType<typeof queryKeys.appointments.infinite>,
    string | undefined
  >({
    queryKey: queryKeys.appointments.infinite(normalizedOptions),
    queryFn: ({ pageParam }) => {
      return fetcher(
        withQueryString("/appointments", {
          ...normalizedOptions,
          limit: options?.limit ?? 50,
          cursor: pageParam,
        }),
      ).then((data: unknown) => listAppointmentsResponseSchema.parse(data));
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
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
  const calendarOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.CALENDAR_SLOTS,
  );
  const normalizedOptions = normalizeAppointmentQueryOptions(options);
  return useAPIQuery<FollowUpResponse[]>(
    queryKeys.followUps.list(normalizedOptions ?? {}),
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
      body: () => undefined,
      invalidateKeys: [queryKeys.followUps.all()],
    },
  );

export const useCancelFollowUp = () =>
  useAPIMutation<FollowUpResponse, { id: string }>(
    ({ id }) => `/follow-ups/${id}/cancel`,
    "PATCH",
    {
      body: () => undefined,
      invalidateKeys: [queryKeys.followUps.all()],
    },
  );

export const useBookFollowUp = () =>
  useAPIMutation<FollowUpResponse, BookFollowUpRequest & { id: string }>(
    ({ id }) => `/follow-ups/${id}/book`,
    "PATCH",
    {
      body: ({ id: _id, ...body }) => body,
      invalidateKeys: [queryKeys.followUps.all(), queryKeys.appointments.all()],
    },
  );

export const useAppointmentRequests = (
  options?: ListAppointmentRequestsQuery | null,
) => {
  const calendarOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.CALENDAR_SLOTS,
  );
  const normalizedOptions = normalizeAppointmentQueryOptions(options);
  return useAPIQuery<AppointmentRequestListResponse>(
    queryKeys.appointmentRequests.list(normalizedOptions ?? {}),
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
    body: ({ id: _id, ...body }) => body,
    invalidateKeys: [
      queryKeys.appointmentRequests.all(),
      queryKeys.appointments.all(),
      queryKeys.patientPortal.appointments.all(),
      queryKeys.doctorAvailabilitySlots.all(),
    ],
    suppressGlobalErrorToast: true,
  });

export const useRejectAppointmentRequest = () =>
  useAPIMutation<
    AppointmentRequestResponse,
    RejectAppointmentRequest & { id: string }
  >(({ id }) => `/appointment-requests/${id}/reject`, "PATCH", {
    body: ({ id: _id, ...body }) => body,
    invalidateKeys: [queryKeys.appointmentRequests.all()],
    suppressGlobalErrorToast: true,
  });

export const useQueue = (options?: { search?: string }) => {
  const queueOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.QUEUE_MANAGEMENT,
  );
  const params = options?.search ? { search: options.search } : undefined;
  return useAPIQuery<QueueItem[]>(
    queryKeys.queue.list(params),
    withQueryString("/queue", {
      search: options?.search,
    }),
    { enabled: queueOk, staleTime: 30_000, gcTime: 5 * 60 * 1000 },
  );
};

export const useQueueByDoctor = (
  doctorId?: string,
  search?: string,
  enabled: boolean = true,
) => {
  const queueOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.QUEUE_MANAGEMENT,
  );
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
    { enabled: queueOk && enabled, staleTime: 30_000, gcTime: 5 * 60 * 1000 },
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
