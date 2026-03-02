import { useInfiniteQuery } from "@tanstack/react-query";
import {
  CreatePatientRequest,
  Patient,
  UpdatePatientRequest,
} from "@workspace/types";
import {
  fetchAPI,
  MedicalHistoryTimelineItem,
  useAPIMutation,
  useAPIQuery,
} from "@/lib/api-core";

export const usePatients = (
  options?: { limit?: number; search?: string } | null,
) => {
  const params = new URLSearchParams();
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.search) params.append("search", options.search);
  const queryString = params.toString();
  const url = queryString ? `/patients?${queryString}` : "/patients";

  return useAPIQuery<{
    items: Patient[];
    nextCursor?: string;
    hasMore: boolean;
    count: number;
  }>(
    ["patients", options?.limit?.toString() ?? "", options?.search ?? ""],
    url,
    { enabled: options !== null },
  );
};

export const useInfinitePatients = (options?: {
  limit?: number;
  search?: string;
}) => {
  return useInfiniteQuery({
    queryKey: ["patients", "infinite", options?.search ?? ""],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.search) params.append("search", options.search);
      if (pageParam) params.append("cursor", pageParam as string);
      const queryString = params.toString();
      return fetchAPI<{
        items: Patient[];
        nextCursor?: string;
        hasMore: boolean;
        count: number;
      }>(`/patients?${queryString}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
};

export const useRecentPatients = (limit: number = 5) => {
  return useAPIQuery<{
    items: Patient[];
    nextCursor?: string;
    hasMore: boolean;
    count: number;
  }>(["patients", "recent", limit.toString()], `/patients?limit=${limit}`);
};

export const usePatient = (id: string) =>
  useAPIQuery<Patient>(["patients", id], `/patients/${id}`, {
    enabled: !!id,
  });

export const usePatientMedicalHistoryTimeline = (patientId: string) =>
  useAPIQuery<MedicalHistoryTimelineItem[]>(
    ["patients", patientId, "medical-history-timeline"],
    `/patients/${patientId}/medical-history-timeline`,
    { enabled: !!patientId },
  );

export const useCreatePatient = () =>
  useAPIMutation<Patient, CreatePatientRequest>("/patients", "POST", {
    invalidateKeys: [["patients"]],
  });

export const useUpdatePatient = (id: string) =>
  useAPIMutation<Patient, UpdatePatientRequest>(`/patients/${id}`, "PATCH", {
    invalidateKeys: [["patients"], ["patients", id]],
  });

export const useDeletePatient = (id: string) =>
  useAPIMutation<void, void>(`/patients/${id}`, "DELETE", {
    invalidateKeys: [["patients"]],
  });

export const useTodaysPatients = (doctorId?: string, search?: string) =>
  useAPIQuery<{
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
    ["todays-patients", doctorId ?? "all", search ?? ""],
    `/queue/today?${new URLSearchParams({
      ...(doctorId && { doctorId }),
      ...(search && { search }),
    }).toString()}`,
  );
