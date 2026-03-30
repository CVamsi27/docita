import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Appointment,
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

export const useAppointments = (
  options?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    search?: string;
  } | null,
) => {
  const url = withQueryString("/appointments", {
    date: options?.date,
    startDate: options?.startDate,
    endDate: options?.endDate,
    doctorId: options?.doctorId,
    search: options?.search,
  });

  return useAPIQuery<PaginatedResponse<AppointmentWithRelations>>(
    [
      "appointments",
      options?.date ?? "",
      options?.startDate ?? "",
      options?.endDate ?? "",
      options?.doctorId ?? "",
      options?.search ?? "",
    ],
    url,
    { enabled: options !== null },
  );
};

export const useTodayAppointments = (enabled: boolean = true) => {
  const today = new Date().toISOString().split("T")[0] ?? "";
  return useAPIQuery<PaginatedResponse<AppointmentWithRelations>>(
    ["appointments", "today", today],
    `/appointments?date=${today}`,
    { enabled },
  );
};

export const useAppointment = (id: string) =>
  useAPIQuery<AppointmentWithRelations>(
    ["appointments", id],
    `/appointments/${id}`,
  );

export const usePatientAppointments = (patientId: string) =>
  useAPIQuery<PaginatedResponse<AppointmentWithRelations>>(
    ["appointments", "patient", patientId],
    `/appointments?patientId=${patientId}`,
    { enabled: !!patientId },
  );

export const useCreateAppointment = () =>
  useAPIMutation<Appointment, CreateAppointmentRequest>(
    "/appointments",
    "POST",
    {
      invalidateKeys: [["appointments"]],
    },
  );

export const useUpdateAppointment = (id: string) =>
  useAPIMutation<Appointment, UpdateAppointmentRequest>(
    `/appointments/${id}`,
    "PUT",
    {
      invalidateKeys: [["appointments"], ["appointments", id]],
    },
  );

export const useInfiniteAppointments = (options?: {
  limit?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) => {
  return useInfiniteQuery({
    queryKey: [
      "appointments",
      "infinite",
      options?.limit,
      options?.date,
      options?.startDate,
      options?.endDate,
      options?.search,
    ],
    queryFn: ({ pageParam }) => {
      return fetchAPI<PaginatedResponse<Appointment & { patient?: Patient }>>(
        withQueryString("/appointments", {
          limit: options?.limit || 50,
          cursor: pageParam as string | undefined,
          date: options?.date,
          startDate: options?.startDate,
          endDate: options?.endDate,
          search: options?.search,
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
  );

export const useQueue = (options?: { search?: string }) => {
  return useAPIQuery<QueueItem[]>(
    ["queue", options?.search ?? ""],
    withQueryString("/queue", {
      search: options?.search,
    }),
  );
};

export const useQueueByDoctor = (doctorId?: string, search?: string) => {
  return useAPIQuery<QueueItem[]>(
    ["queue", doctorId ?? "all", search ?? ""],
    withQueryString("/queue", { doctorId, search }),
  );
};

export const useCallPatient = () =>
  useAPIMutation<QueueItem, string>(
    (queueId) => `/queue/call/${queueId}`,
    "POST",
    {
      invalidateKeys: [["queue"]],
    },
  );

export const useCompletePatient = () =>
  useAPIMutation<QueueItem, string>(
    (queueId) => `/queue/complete/${queueId}`,
    "POST",
    {
      invalidateKeys: [["queue"]],
    },
  );

export const useResetQueue = () =>
  useAPIMutation<{ success: boolean }, void>("/queue/reset", "POST", {
    invalidateKeys: [["queue"]],
  });
