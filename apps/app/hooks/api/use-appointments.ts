import { useInfiniteQuery } from "@tanstack/react-query";
import {
    Appointment,
    CreateAppointmentInput,
    Patient,
    UpdateAppointmentInput,
} from "@workspace/types";
import {
    API_URL,
    PaginatedResponse,
    useAPIMutation,
    useAPIQuery,
} from "../../lib/api-core";

export const useAppointments = (
    options?: {
        date?: string;
        startDate?: string;
        endDate?: string;
        doctorId?: string;
        search?: string;
    } | null,
) => {
    const params = new URLSearchParams();
    if (options?.date) params.append("date", options.date);
    if (options?.startDate) params.append("startDate", options.startDate);
    if (options?.endDate) params.append("endDate", options.endDate);
    if (options?.doctorId) params.append("doctorId", options.doctorId);
    if (options?.search) params.append("search", options.search);
    const queryString = params.toString();
    const url = queryString ? `/appointments?${queryString}` : "/appointments";

    return useAPIQuery<PaginatedResponse<Appointment & { patient?: Patient }>>(
        [
            "appointments",
            options?.date ?? "",
            options?.startDate ?? "",
            options?.endDate ?? "",
            options?.doctorId ?? "",
            options?.search ?? "",
        ],
        url,
        { enabled: options !== null }, // Disable only if explicitly passed null
    );
};

export const useTodayAppointments = (enabled: boolean = true) => {
    const today = new Date().toISOString().split("T")[0] ?? "";
    return useAPIQuery<PaginatedResponse<Appointment & { patient?: Patient }>>(
        ["appointments", "today", today],
        `/appointments?date=${today}`,
        { enabled },
    );
};

export const useAppointment = (id: string) =>
    useAPIQuery<Appointment & { patient?: Patient }>(
        ["appointments", id],
        `/appointments/${id}`,
    );

export const usePatientAppointments = (patientId: string) =>
    useAPIQuery<PaginatedResponse<Appointment & { patient?: Patient }>>(
        ["appointments", "patient", patientId],
        `/appointments?patientId=${patientId}`,
        { enabled: !!patientId },
    );

export const useCreateAppointment = () =>
    useAPIMutation<Appointment, CreateAppointmentInput>(
        "/appointments",
        "POST",
    );

export const useUpdateAppointment = (id: string) =>
    useAPIMutation<Appointment, UpdateAppointmentInput>(
        `/appointments/${id}`,
        "PUT",
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
        queryFn: async ({ pageParam }) => {
            const params = new URLSearchParams({
                limit: (options?.limit || 50).toString(),
                ...(pageParam && { cursor: pageParam }),
                ...(options?.date && { date: options.date }),
                ...(options?.startDate && { startDate: options.startDate }),
                ...(options?.endDate && { endDate: options.endDate }),
                ...(options?.search && { search: options.search }),
            });

            const response = await fetch(`${API_URL}/appointments?${params}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            if (!response.ok) throw new Error("Failed to fetch appointments");
            return response.json() as Promise<{
                items: Appointment[];
                nextCursor: string | null;
                hasMore: boolean;
                count: number;
            }>;
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: undefined as string | undefined,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
};

// Queue related
export const useCheckInAppointment = () =>
    useAPIMutation<unknown, string>(
        (id) => `/queue/check-in/${id}`,
        "POST",
    );

export const useQueue = (options?: { search?: string }) => {
    const params = new URLSearchParams();
    if (options?.search) params.append("search", options.search);
    const queryString = params.toString();
    return useAPIQuery<
        {
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
        }[]
    >(["queue", options?.search ?? ""], queryString ? `/queue?${queryString}` : "/queue");
};

export const useQueueByDoctor = (doctorId?: string, search?: string) => {
    const params = new URLSearchParams();
    if (doctorId) params.append("doctorId", doctorId);
    if (search) params.append("search", search);
    const queryString = params.toString();
    return useAPIQuery<
        {
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
        }[]
    >(
        ["queue", doctorId ?? "all", search ?? ""],
        `/queue${queryString ? `?${queryString}` : ""}`,
    );
};

export const useQueueStats = (doctorId?: string, search?: string) => {
    const params = new URLSearchParams();
    if (doctorId) params.append("doctorId", doctorId);
    if (search) params.append("search", search);
    const queryString = params.toString();
    return useAPIQuery<{
        waiting: number;
        inProgress: number;
        completed: number;
        noShow: number;
        cancelled: number;
        total: number;
        scheduled: number;
        walkIns: number;
        lateArrivals: number;
        avgWaitTime: number;
    }>(
        ["queue-stats", doctorId ?? "all", search ?? ""],
        `/queue/stats${queryString ? `?${queryString}` : ""}`,
    );
};

export const useQueueSettings = () =>
    useAPIQuery<{
        queueBufferMinutes: number;
        useDoctorQueues: boolean;
        lateArrivalGraceMinutes: number;
        avgConsultationMinutes: number;
    }>(["queue-settings"], "/queue/settings");

export const useUpdateQueueSettings = () =>
    useAPIMutation<
        unknown,
        {
            queueBufferMinutes?: number;
            useDoctorQueues?: boolean;
            lateArrivalGraceMinutes?: number;
            avgConsultationMinutes?: number;
        }
    >("/queue/settings", "PATCH");

export const useCreateQueueToken = () =>
    useAPIMutation<
        unknown,
        {
            patientId: string;
            appointmentId?: string;
            doctorId?: string;
            priority?: number;
            notes?: string;
        }
    >("/queue", "POST");

export const useUpdateQueue = (id: string) =>
    useAPIMutation<
        unknown,
        { status?: string; priority?: number; notes?: string }
    >(`/queue/${id}`, "PATCH");

export const useCreateWalkIn = () =>
    useAPIMutation<unknown, { patientName: string; phoneNumber: string; reason?: string }>(
        "/queue/walk-in",
        "POST",
    );

export const useCallNextInQueue = (doctorId?: string) =>
    useAPIMutation<unknown, void>(
        `/queue/call-next${doctorId ? `?doctorId=${doctorId}` : ""}`,
        "POST",
    );

export const useGetEstimatedWaitTime = (tokenId: string) =>
    useAPIQuery<{
        estimatedMinutes: number;
        position: number;
        tokensAhead: number;
    }>(["queue-wait-time", tokenId], `/queue/${tokenId}/wait-time`);

export const useUpdateAppointmentObservations = (id: string) =>
    useAPIMutation<Appointment, UpdateAppointmentInput>(
        `/appointments/${id}`,
        "PATCH",
    );

export const useUpdateVisitCoding = (appointmentId: string) =>
    useAPIMutation<Appointment, UpdateAppointmentInput>(
        `/appointments/${appointmentId}`,
        "PATCH",
    );

export const useAvailableSlots = (date: string, doctorId?: string) =>
    useAPIQuery<
        {
            time: string;
            endTime: string;
            doctorId: string;
            doctorName: string;
            specialization?: string;
            isAvailable: boolean;
        }[]
    >(
        ["available-slots", date, doctorId || "all"],
        `/doctor-availability/slots?date=${date}${doctorId ? `&doctorId=${doctorId}` : ""}`,
        { enabled: !!date },
    );
