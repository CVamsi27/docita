import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { API_URL } from "./api";
import {
  Patient,
  Appointment,
  CreatePatientInput,
  CreateAppointmentInput,
  UpdatePatientInput,
  UpdateAppointmentInput,
  Prescription,
  CreatePrescriptionInput,
  Invoice,
  CreateInvoiceInput,
  Document,
  AnalyticsOverview,
  DiseaseTrend,
  RevenueByCPT,
  ComplianceMetric,
  IcdCode,
  CptCode,
  IcdFavorite,
  CptFavorite,
  VitalSign,
  Clinic,
  User,
  DashboardStats,
  ClinicalTemplate,
} from "@workspace/types";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("docita_token");
}

function handleAuthError() {
  // Clear invalid token
  if (typeof window !== "undefined") {
    localStorage.removeItem("docita_token");
    localStorage.removeItem("docita_user");
    // Redirect to login
    const currentPath = window.location.pathname;
    if (currentPath !== "/login") {
      sessionStorage.setItem("redirectAfterLogin", currentPath);
      window.location.href = "/login";
    }
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - token is invalid or expired
      if (response.status === 401) {
        handleAuthError();
        throw new Error("Session expired. Please log in again.");
      }

      // Handle other errors
      const error = await response
        .json()
        .catch(() => ({ message: "An error occurred" }));
      throw new Error(
        error.message || `HTTP error! status: ${response.status}`,
      );
    }

    return response.json();
  } catch (error) {
    // Re-throw with better error messaging
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch from API");
  }
}

export function useAPIQuery<T>(
  key: string[],
  endpoint: string,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => fetchAPI<T>(endpoint),
    enabled: true, // Default to enabled, can be overridden in options
    ...options,
  });
}

export function useAPIMutation<TData, TVariables>(
  endpoint: string,
  method: "POST" | "PUT" | "DELETE" | "PATCH" = "POST",
  options?: UseMutationOptions<TData, Error, TVariables>,
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) =>
      fetchAPI<TData>(endpoint, {
        method,
        body: JSON.stringify(variables),
      }),
    onSuccess: () => {
      // Invalidate all queries but wait for refetch to complete
      void queryClient.invalidateQueries({});
    },
    ...options,
  });
}

export const apiHooks = {
  // Dashboard
  useDashboardStats: () =>
    useAPIQuery<DashboardStats>(["dashboard-stats"], "/dashboard/stats"),

  // Patients
  usePatients: (options?: { limit?: number; search?: string } | null) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.search) params.append("search", options.search);
    const queryString = params.toString();
    const url = queryString ? `/patients?${queryString}` : "/patients";

    return useAPIQuery<Patient[]>(
      ["patients", options?.limit?.toString() ?? "", options?.search ?? ""],
      url,
      { enabled: options !== null }, // Disable only if explicitly passed null
    );
  },
  useRecentPatients: (limit: number = 5) => {
    return useAPIQuery<Patient[]>(
      ["patients", "recent", limit.toString()],
      `/patients?limit=${limit}`,
    );
  },
  usePatient: (id: string) =>
    useAPIQuery<Patient>(["patients", id], `/patients/${id}`, {
      enabled: !!id,
    }),
  useCreatePatient: () =>
    useAPIMutation<Patient, CreatePatientInput>("/patients", "POST"),
  useUpdatePatient: (id: string) =>
    useAPIMutation<Patient, UpdatePatientInput>(`/patients/${id}`, "PUT"),
  useDeletePatient: (id: string) =>
    useAPIMutation<void, void>(`/patients/${id}`, "DELETE"),
  useUpdateProfile: () =>
    useAPIMutation<User, { name?: string; email?: string }>(
      "/users/profile",
      "PUT",
    ),
  usePatientAppointments: (patientId: string) =>
    useAPIQuery<Appointment[]>(
      ["patients", patientId, "appointments"],
      `/patients/${patientId}/appointments`,
    ),

  // Appointments
  useAppointments: (options?: {
    date?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (options?.date) params.append("date", options.date);
    if (options?.startDate) params.append("startDate", options.startDate);
    if (options?.endDate) params.append("endDate", options.endDate);
    const queryString = params.toString();
    const url = queryString ? `/appointments?${queryString}` : "/appointments";

    return useAPIQuery<(Appointment & { patient?: Patient })[]>(
      [
        "appointments",
        options?.date ?? "",
        options?.startDate ?? "",
        options?.endDate ?? "",
      ],
      url,
    );
  },
  useTodayAppointments: () => {
    const today = new Date().toISOString().split("T")[0] ?? "";
    return useAPIQuery<(Appointment & { patient?: Patient })[]>(
      ["appointments", "today", today],
      `/appointments?date=${today}`,
    );
  },
  useAppointment: (id: string) =>
    useAPIQuery<Appointment & { patient?: Patient }>(
      ["appointments", id],
      `/appointments/${id}`,
    ),
  useCreateAppointment: () =>
    useAPIMutation<Appointment, CreateAppointmentInput>(
      "/appointments",
      "POST",
    ),
  useUpdateAppointment: (id: string) =>
    useAPIMutation<Appointment, UpdateAppointmentInput>(
      `/appointments/${id}`,
      "PUT",
    ),

  // Prescriptions
  usePrescriptions: () =>
    useAPIQuery<(Prescription & { patient: Patient })[]>(
      ["prescriptions"],
      "/prescriptions",
    ),
  usePrescription: (id: string) =>
    useAPIQuery<Prescription & { patient: Patient }>(
      ["prescriptions", id],
      `/prescriptions/${id}`,
    ),
  useCreatePrescription: () =>
    useAPIMutation<Prescription, CreatePrescriptionInput>(
      "/prescriptions",
      "POST",
    ),

  // Invoices
  useInvoices: () =>
    useAPIQuery<
      (Invoice & {
        patient: Patient;
        appointment?: { doctor: { name: string } };
      })[]
    >(["invoices"], "/invoices"),
  useInvoice: (id: string) =>
    useAPIQuery<Invoice & { patient: Patient }>(
      ["invoices", id],
      `/invoices/${id}`,
    ),
  useCreateInvoice: () =>
    useAPIMutation<Invoice, CreateInvoiceInput>("/invoices", "POST"),

  // Documents
  useDocuments: () => useAPIQuery<Document[]>(["documents"], "/documents"),
  useDocument: (id: string) =>
    useAPIQuery<Document>(["documents", id], `/documents/${id}`),

  // Analytics
  useAnalyticsOverview: () =>
    useAPIQuery<AnalyticsOverview>(
      ["analytics", "overview"],
      "/analytics/overview",
    ),
  useDiseaseTrends: (
    clinicId: string,
    startDate?: string,
    endDate?: string,
  ) => {
    const params = new URLSearchParams({ clinicId });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return useAPIQuery<DiseaseTrend[]>(
      ["analytics", "disease-trends", clinicId, startDate || "", endDate || ""],
      `/analytics/disease-trends?${params}`,
    );
  },
  useRevenueByCPT: (clinicId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ clinicId });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return useAPIQuery<RevenueByCPT[]>(
      ["analytics", "revenue-cpt", clinicId, startDate || "", endDate || ""],
      `/analytics/revenue/by-cpt?${params}`,
    );
  },
  useComplianceMetrics: (
    clinicId: string,
    startDate?: string,
    endDate?: string,
  ) => {
    const params = new URLSearchParams({ clinicId });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return useAPIQuery<ComplianceMetric[]>(
      ["analytics", "compliance", clinicId, startDate || "", endDate || ""],
      `/analytics/compliance/metrics?${params}`,
    );
  },

  // Medical Coding
  useICDCodes: (search: string) =>
    useAPIQuery<IcdCode[]>(
      ["icd-codes", search],
      `/medical-coding/icd-codes?search=${encodeURIComponent(search)}`,
    ),
  useCPTCodes: (search: string) =>
    useAPIQuery<CptCode[]>(
      ["cpt-codes", search],
      `/medical-coding/cpt-codes?search=${encodeURIComponent(search)}`,
    ),
  useICDFavorites: () =>
    useAPIQuery<IcdFavorite[]>(["icd-favorites"], "/medical-coding/favorites"),
  useCPTFavorites: () =>
    useAPIQuery<CptFavorite[]>(
      ["cpt-favorites"],
      "/medical-coding/cpt-favorites",
    ),
  useAddICDFavorite: () =>
    useAPIMutation<IcdFavorite, { icdCodeId: string }>(
      "/medical-coding/favorites",
      "POST",
    ),
  useRemoveICDFavorite: (id: string) =>
    useAPIMutation<void, void>(`/medical-coding/favorites/${id}`, "DELETE"),
  useAddCPTFavorite: () =>
    useAPIMutation<CptFavorite, { cptCodeId: string }>(
      "/medical-coding/cpt-favorites",
      "POST",
    ),
  useRemoveCPTFavorite: (id: string) =>
    useAPIMutation<void, void>(`/medical-coding/cpt-favorites/${id}`, "DELETE"),

  // Consultation & Observations
  useUpdateAppointmentObservations: (id: string) =>
    useAPIMutation<Appointment, UpdateAppointmentInput>(
      `/appointments/${id}`,
      "PATCH",
    ),
  useSaveVitals: (appointmentId: string) =>
    useAPIMutation<VitalSign, VitalSign>(
      `/appointments/${appointmentId}/vitals`,
      "POST",
    ),

  // Settings - Clinic
  useClinicSettings: () =>
    useAPIQuery<Clinic>(["clinic", "settings"], "/clinic/settings"),
  useUpdateClinicSettings: () =>
    useAPIMutation<Clinic, Partial<Clinic>>("/clinic/settings", "PUT"),

  // Settings - Doctors
  useDoctors: () => useAPIQuery<User[]>(["doctors"], "/doctors"),
  useDoctor: (id: string) =>
    useAPIQuery<User>(["doctors", id], `/doctors/${id}`),
  useCreateDoctor: () =>
    useAPIMutation<User, Omit<User, "id" | "createdAt" | "updatedAt">>(
      "/doctors",
      "POST",
    ),
  useUpdateDoctor: (id: string) =>
    useAPIMutation<User, Partial<User>>(`/doctors/${id}`, "PUT"),
  useDeleteDoctor: (id: string) =>
    useAPIMutation<void, void>(`/doctors/${id}`, "DELETE"),

  // Import & OCR
  useImportJobs: () =>
    useAPIQuery<{ id: string; status: string; createdAt: string }[]>(
      ["import-jobs"],
      "/import/jobs",
    ),
  useImportJob: (id: string) =>
    useAPIQuery<{ id: string; status: string; data: unknown }>(
      ["import-jobs", id],
      `/import/jobs/${id}`,
    ),
  useUploadFile: () =>
    useAPIMutation<{ id: string }, FormData>("/import/upload", "POST"),
  useProcessOCR: () =>
    useAPIMutation<
      {
        text: string;
        firstName?: string;
        lastName?: string;
        age?: string;
        gender?: string;
        phoneNumber?: string;
        diagnosis?: string;
        vitals?: { bp?: string; temp?: string; pulse?: string };
      },
      FormData
    >("/import/ocr/process", "POST"),

  // Medical Coding
  useCodingQueue: () =>
    useAPIQuery<Appointment[]>(["coding-queue"], "/medical-coding/uncoded"),
  useSearchIcdCodes: (search: string) =>
    useAPIQuery<IcdCode[]>(
      ["icd-codes", search],
      `/medical-coding/icd-codes?search=${search}`,
      { enabled: search.length >= 2 },
    ),
  useSearchCptCodes: (search: string) =>
    useAPIQuery<CptCode[]>(
      ["cpt-codes", search],
      `/medical-coding/cpt-codes?search=${search}`,
      { enabled: search.length >= 2 },
    ),
  useUpdateVisitCoding: (appointmentId: string) =>
    useAPIMutation<Appointment, UpdateAppointmentInput>(
      `/appointments/${appointmentId}`,
      "PATCH",
    ),

  // Lab Tests
  useLabTests: () =>
    useAPIQuery<{ id: string; status: string; createdAt: Date }[]>(
      ["lab-tests"],
      "/lab-tests/orders",
    ),
  useLabTestsStats: () =>
    useAPIQuery<{ totalOrders: number; pendingOrders: number }>(
      ["lab-tests", "stats"],
      "/lab-tests/orders/stats",
    ),
  useCreateLabTestOrder: () =>
    useAPIMutation<
      { id: string; status: string },
      {
        patientId: string;
        labTestId: string;
        appointmentId?: string;
        notes?: string;
      }
    >("/lab-tests/orders", "POST"),
  useUpdateLabTestOrder: (id: string) =>
    useAPIMutation<
      { id: string; status: string },
      {
        status?: string;
        result?: Record<string, unknown>;
        resultUrl?: string;
        notes?: string;
      }
    >(`/lab-tests/orders/${id}`, "PATCH"),

  // Invoice operations
  useUpdateInvoice: (id: string) =>
    useAPIMutation<Invoice, Partial<Invoice>>(`/invoices/${id}`, "PUT"),
  useDeleteInvoice: (id: string) =>
    useAPIMutation<void, void>(`/invoices/${id}`, "DELETE"),

  // Prescription operations
  useUpdatePrescription: (id: string) =>
    useAPIMutation<Prescription, Partial<Prescription>>(
      `/prescriptions/${id}`,
      "PUT",
    ),
  useDeletePrescription: (id: string) =>
    useAPIMutation<void, void>(`/prescriptions/${id}`, "DELETE"),

  // Templates
  useTemplates: () =>
    useAPIQuery<ClinicalTemplate[]>(["templates"], "/templates"),

  // Subscription & Tier Config
  useTierConfig: () =>
    useAPIQuery<{
      tiers: Array<{
        id: string;
        tier: number;
        name: string;
        description: string;
        tagline: string;
        color: string;
        pricing: {
          monthly: number | "custom";
          yearly: number | "custom";
          currency: string;
        };
        limits: {
          patients: number;
          doctors: number;
          storageGB: number;
          branches: number;
        };
        features: string[];
      }>;
      featureTierMap: Record<string, number>;
      featureDisplay: Record<string, { name: string; description: string }>;
      intelligenceAddons: Array<{
        feature: string;
        name: string;
        description: string;
        monthlyPrice: number;
        icon: string;
      }>;
      intelligenceBundleDiscount: number;
      intelligenceInfo: {
        name: string;
        description: string;
        tagline: string;
        color: string;
        pricing: {
          monthly: number | "custom";
          yearly: number | "custom";
          currency: string;
        };
        features: string[];
      };
    }>(["tier-config"], "/subscription/config", {
      staleTime: 1000 * 60 * 60, // Cache for 1 hour
      refetchOnWindowFocus: true, // Refresh when user returns from admin portal
    }),

  useSubscription: () =>
    useAPIQuery<{
      id: string;
      name: string;
      tier: string;
      tierName: string;
      tierFeatures: string[];
      intelligenceAddon: string;
      intelligenceFeatures: string[];
      subscriptionStatus: string;
      trialEndsAt: string | null;
      isTrialing: boolean;
      trialDaysRemaining: number | null;
    }>(["subscription"], "/subscription", {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true, // Refresh when user returns from admin portal
    }),

  // Queue Management
  useQueue: () =>
    useAPIQuery<
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
        // New queue-appointment sync fields
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
    >(["queue"], "/queue"),

  // Unified Today's Patients (combines appointments + walk-ins)
  useTodaysPatients: (doctorId?: string) =>
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
      ["todays-patients", doctorId ?? "all"],
      `/queue/today${doctorId ? `?doctorId=${doctorId}` : ""}`,
    ),

  useQueueByDoctor: (doctorId?: string) =>
    useAPIQuery<
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
      ["queue", doctorId ?? "all"],
      `/queue${doctorId ? `?doctorId=${doctorId}` : ""}`,
    ),
  useQueueStats: (doctorId?: string) =>
    useAPIQuery<{
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
      ["queue-stats", doctorId ?? "all"],
      `/queue/stats${doctorId ? `?doctorId=${doctorId}` : ""}`,
    ),
  useQueueSettings: () =>
    useAPIQuery<{
      queueBufferMinutes: number;
      useDoctorQueues: boolean;
      lateArrivalGraceMinutes: number;
      avgConsultationMinutes: number;
    }>(["queue-settings"], "/queue/settings"),
  useUpdateQueueSettings: () =>
    useAPIMutation<
      unknown,
      {
        queueBufferMinutes?: number;
        useDoctorQueues?: boolean;
        lateArrivalGraceMinutes?: number;
        avgConsultationMinutes?: number;
      }
    >("/queue/settings", "PATCH"),
  useCreateQueueToken: () =>
    useAPIMutation<
      unknown,
      {
        patientId: string;
        appointmentId?: string;
        doctorId?: string;
        priority?: number;
        notes?: string;
      }
    >("/queue", "POST"),
  useCheckInAppointment: (appointmentId: string) =>
    useAPIMutation<unknown, void>(`/queue/check-in/${appointmentId}`, "POST"),
  useUpdateQueueToken: (id: string) =>
    useAPIMutation<
      unknown,
      { status?: string; priority?: number; notes?: string }
    >(`/queue/${id}`, "PATCH"),
  useCallNextInQueue: (doctorId?: string) =>
    useAPIMutation<unknown, void>(
      `/queue/call-next${doctorId ? `?doctorId=${doctorId}` : ""}`,
      "POST",
    ),
  useGetEstimatedWaitTime: (tokenId: string) =>
    useAPIQuery<{
      estimatedMinutes: number;
      position: number;
      tokensAhead: number;
    }>(["queue-wait-time", tokenId], `/queue/${tokenId}/wait-time`),

  // Lab Tests
  useLabTestOrders: () =>
    useAPIQuery<
      {
        id: string;
        clinicId: string;
        patientId: string;
        appointmentId?: string;
        labTestId: string;
        status: string;
        result?: Record<string, unknown>;
        resultUrl?: string;
        notes?: string;
        orderedBy: string;
        collectedAt?: string;
        completedAt?: string;
        createdAt: string;
        labTest: {
          id: string;
          name: string;
          code?: string;
          category: string;
          price?: number;
        };
        patient?: {
          id: string;
          firstName: string;
          lastName: string;
          phoneNumber: string;
        };
        doctor?: { id: string; name: string };
      }[]
    >(["lab-test-orders"], "/lab-tests/orders"),
  useLabTestStats: () =>
    useAPIQuery<{
      pending: number;
      inProgress: number;
      completed: number;
      urgent: number;
      total: number;
    }>(["lab-test-stats"], "/lab-tests/orders/stats"),
  useLabTestCatalog: () =>
    useAPIQuery<
      {
        id: string;
        clinicId: string;
        name: string;
        code?: string;
        category: string;
        price?: number;
        description?: string;
        active: boolean;
      }[]
    >(["lab-test-catalog"], "/lab-tests/catalog"),

  // Inventory
  useInventory: () =>
    useAPIQuery<
      {
        id: string;
        clinicId: string;
        name: string;
        category: string;
        sku?: string;
        quantity: number;
        minQuantity: number;
        unit: string;
        purchasePrice?: number;
        sellingPrice?: number;
        expiryDate?: string;
        batchNumber?: string;
        supplier?: string;
        active: boolean;
        createdAt: string;
      }[]
    >(["inventory"], "/inventory"),
  useInventoryStats: () =>
    useAPIQuery<{
      totalItems: number;
      totalStock: number;
      lowStock: number;
      critical: number;
      expiringSoon: number;
    }>(["inventory-stats"], "/inventory/stats"),
  useInventoryItem: (id: string) =>
    useAPIQuery<{
      id: string;
      name: string;
      category: string;
      quantity: number;
      minQuantity: number;
      unit: string;
      expiryDate?: string;
      movements: {
        id: string;
        type: string;
        quantity: number;
        createdAt: string;
      }[];
    }>(["inventory", id], `/inventory/${id}`),
  useCreateInventoryItem: () =>
    useAPIMutation<
      unknown,
      {
        name: string;
        category: string;
        sku?: string;
        quantity?: number;
        minQuantity?: number;
        unit?: string;
        purchasePrice?: number;
        sellingPrice?: number;
        expiryDate?: Date;
        batchNumber?: string;
        supplier?: string;
      }
    >("/inventory", "POST"),
  useUpdateInventoryItem: (id: string) =>
    useAPIMutation<
      unknown,
      {
        name?: string;
        category?: string;
        quantity?: number;
        minQuantity?: number;
        unit?: string;
        expiryDate?: Date;
        active?: boolean;
      }
    >(`/inventory/${id}`, "PATCH"),
  useAddInventoryMovement: (itemId: string) =>
    useAPIMutation<
      unknown,
      {
        type: string;
        quantity: number;
        referenceType?: string;
        referenceId?: string;
        notes?: string;
      }
    >(`/inventory/${itemId}/movements`, "POST"),

  // Doctor Availability
  useDoctorSchedules: (doctorId?: string) =>
    useAPIQuery<
      {
        id: string;
        doctorId: string;
        clinicId: string;
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        slotDuration: number;
        isActive: boolean;
        doctor?: { id: string; name: string };
        clinic?: { id: string; name: string };
      }[]
    >(
      ["doctor-schedules", doctorId || "me"],
      `/doctor-availability/schedules${doctorId ? `?doctorId=${doctorId}` : ""}`,
    ),
  useClinicSchedules: () =>
    useAPIQuery<
      {
        id: string;
        doctorId: string;
        clinicId: string;
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        slotDuration: number;
        isActive: boolean;
        doctor?: { id: string; name: string; specialization?: string };
      }[]
    >(["clinic-schedules"], "/doctor-availability/schedules/clinic"),
  useCreateDoctorSchedule: () =>
    useAPIMutation<
      unknown,
      {
        doctorId?: string;
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        slotDuration?: number;
        isActive?: boolean;
      }
    >("/doctor-availability/schedules", "POST"),
  useBulkDoctorSchedules: () =>
    useAPIMutation<
      unknown,
      {
        doctorId?: string;
        schedules: {
          dayOfWeek: string;
          startTime: string;
          endTime: string;
          slotDuration?: number;
          isActive?: boolean;
        }[];
      }
    >("/doctor-availability/schedules/bulk", "POST"),
  useUpdateDoctorSchedule: (id: string) =>
    useAPIMutation<
      unknown,
      {
        startTime?: string;
        endTime?: string;
        slotDuration?: number;
        isActive?: boolean;
      }
    >(`/doctor-availability/schedules/${id}`, "PUT"),
  useDeleteDoctorSchedule: (id: string) =>
    useAPIMutation<unknown, void>(
      `/doctor-availability/schedules/${id}`,
      "DELETE",
    ),
  useDoctorTimeOffs: (doctorId?: string, upcoming?: boolean) =>
    useAPIQuery<
      {
        id: string;
        doctorId: string;
        clinicId?: string;
        startDate: string;
        endDate: string;
        reason?: string;
        isFullDay: boolean;
        startTime?: string;
        endTime?: string;
        doctor?: { id: string; name: string };
        clinic?: { id: string; name: string };
      }[]
    >(
      ["doctor-time-offs", doctorId || "me", upcoming ? "upcoming" : "all"],
      `/doctor-availability/time-off${doctorId ? `?doctorId=${doctorId}` : ""}${upcoming ? "&upcoming=true" : ""}`,
    ),
  useCreateDoctorTimeOff: () =>
    useAPIMutation<
      unknown,
      {
        doctorId?: string;
        startDate: string;
        endDate: string;
        reason?: string;
        isFullDay?: boolean;
        startTime?: string;
        endTime?: string;
      }
    >("/doctor-availability/time-off", "POST"),
  useDeleteDoctorTimeOff: (id: string) =>
    useAPIMutation<unknown, void>(
      `/doctor-availability/time-off/${id}`,
      "DELETE",
    ),
  useAvailableSlots: (date: string, doctorId?: string) =>
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
    ),

  // ============================================================================
  // Feedback
  // ============================================================================
  useFeedbackCanSubmit: () =>
    useAPIQuery<{ canSubmit: boolean }>(
      ["feedback-can-submit"],
      "/feedback/can-submit",
    ),
  useMyFeedback: () =>
    useAPIQuery<
      {
        id: string;
        overallRating: number;
        goodFeatures: string[];
        goodFeaturesReason?: string;
        badFeatures: string[];
        badFeaturesReason?: string;
        improvementAreas: string[];
        improvementReason?: string;
        featureRequests?: string;
        generalComments?: string;
        category: string;
        status: string;
        createdAt: string;
        clinic: { id: string; name: string };
      }[]
    >(["my-feedback"], "/feedback/my-feedback"),
  useFeedbackStats: (clinicId?: string) =>
    useAPIQuery<{
      total: number;
      byStatus: Record<string, number>;
      byCategory: Record<string, number>;
      averageRating: number;
      recentFeedback: number;
      topGoodFeatures: { feature: string; count: number }[];
      topBadFeatures: { feature: string; count: number }[];
      topImprovementAreas: { feature: string; count: number }[];
    }>(
      ["feedback-stats", clinicId ?? "all"],
      `/feedback/stats${clinicId ? `?clinicId=${clinicId}` : ""}`,
    ),
  useAllFeedback: (filters?: {
    status?: string;
    category?: string;
    clinicId?: string;
    startDate?: string;
    endDate?: string;
    minRating?: number;
    maxRating?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.clinicId) params.append("clinicId", filters.clinicId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.minRating)
      params.append("minRating", String(filters.minRating));
    if (filters?.maxRating)
      params.append("maxRating", String(filters.maxRating));
    const queryString = params.toString();
    return useAPIQuery<
      {
        id: string;
        overallRating: number;
        goodFeatures: string[];
        goodFeaturesReason?: string;
        badFeatures: string[];
        badFeaturesReason?: string;
        improvementAreas: string[];
        improvementReason?: string;
        featureRequests?: string;
        generalComments?: string;
        category: string;
        status: string;
        adminNotes?: string;
        createdAt: string;
        user: { id: string; name: string; email: string; role: string };
        clinic: { id: string; name: string; tier: string };
      }[]
    >(
      ["all-feedback", queryString],
      `/feedback/all${queryString ? `?${queryString}` : ""}`,
    );
  },
  useClinicFeedback: () =>
    useAPIQuery<
      {
        id: string;
        overallRating: number;
        goodFeatures: string[];
        goodFeaturesReason?: string;
        badFeatures: string[];
        badFeaturesReason?: string;
        improvementAreas: string[];
        improvementReason?: string;
        featureRequests?: string;
        generalComments?: string;
        category: string;
        status: string;
        createdAt: string;
        user: { id: string; name: string; email: string };
      }[]
    >(["clinic-feedback"], "/feedback/clinic"),
  useSubmitFeedback: () =>
    useAPIMutation<
      unknown,
      {
        overallRating: number;
        goodFeatures?: string[];
        goodFeaturesReason?: string;
        badFeatures?: string[];
        badFeaturesReason?: string;
        improvementAreas?: string[];
        improvementReason?: string;
        featureRequests?: string;
        generalComments?: string;
        category?: string;
      }
    >("/feedback", "POST"),
  useUpdateFeedbackStatus: (id: string) =>
    useAPIMutation<unknown, { status: string; adminNotes?: string }>(
      `/feedback/${id}/status`,
      "PATCH",
    ),
  useDeleteFeedback: (id: string) =>
    useAPIMutation<unknown, void>(`/feedback/${id}`, "DELETE"),

  // ==========================================================================
  // Billing & Payments
  // ==========================================================================

  useBillingStatus: () =>
    useAPIQuery<{
      subscription: {
        id: string;
        status: string;
        tier: string;
        billingCycle: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        graceEndsAt?: Date;
        scheduledChange?: {
          tier: string;
          billingCycle: string;
          effectiveDate: Date;
        };
      } | null;
      referralCredits: number;
      pendingReferralDiscount: number;
      lastPayment?: {
        amount: number;
        currency: string;
        date: Date;
        status: string;
      };
    }>(["billing-status"], "/subscription/billing/status", {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
    }),

  usePaymentHistory: () =>
    useAPIQuery<
      {
        id: string;
        amount: number;
        currency: string;
        status: string;
        paymentMethod?: string;
        tier: string;
        billingCycle: string;
        invoiceUrl?: string;
        createdAt: string;
      }[]
    >(["payment-history"], "/subscription/billing/payments", {
      staleTime: 1000 * 60 * 5,
    }),

  useProrationPreview: (tier: string, billingCycle: string) =>
    useAPIQuery<{
      currentTier: string;
      newTier: string;
      currentCycle: string;
      newCycle: string;
      creditCents: number;
      chargeCents: number;
      daysRemaining: number;
      billingCycleDays: number;
      finalAmountCents: number;
      discount?: {
        type: string;
        percent: number;
        description: string;
      };
    }>(
      ["proration-preview", tier, billingCycle],
      `/subscription/billing/preview?tier=${tier}&cycle=${billingCycle}`,
      {
        enabled: !!tier && !!billingCycle,
        staleTime: 1000 * 60, // 1 minute
      },
    ),

  useCreateCheckout: () =>
    useAPIMutation<
      {
        orderId: string;
        amount: number;
        currency: string;
        razorpayKeyId: string;
        prefill: {
          name: string;
          email: string;
          contact?: string;
        };
      },
      {
        tier: string;
        billingCycle: string;
        referralCode?: string;
      }
    >("/subscription/billing/checkout", "POST"),

  useActivateSubscription: () =>
    useAPIMutation<
      {
        success: boolean;
        subscription: {
          id: string;
          tier: string;
          status: string;
        };
      },
      {
        razorpayPaymentId: string;
        razorpayOrderId: string;
        razorpaySignature: string;
        tier: string;
        billingCycle: string;
      }
    >("/subscription/billing/activate", "POST"),

  useCancelSubscription: () =>
    useAPIMutation<
      { success: boolean; message: string },
      { immediate?: boolean }
    >("/subscription/billing/cancel", "POST"),

  // ==========================================================================
  // Referrals
  // ==========================================================================

  useReferralCode: () =>
    useAPIQuery<{
      code: string;
      referralLink: string;
    }>(["referral-code"], "/referrals/code", {
      staleTime: 1000 * 60 * 60, // 1 hour
    }),

  useReferralStats: () =>
    useAPIQuery<{
      totalReferrals: number;
      convertedReferrals: number;
      pendingReferrals: number;
      totalCreditsEarned: number;
      remainingCredits: number;
      maxCreditsPerYear: number;
    }>(["referral-stats"], "/referrals/my-stats", {
      staleTime: 1000 * 60 * 5,
    }),

  useReferralHistory: () =>
    useAPIQuery<
      {
        id: string;
        referredClinicName: string;
        status: string;
        creditMonths: number;
        convertedAt?: string;
        createdAt: string;
      }[]
    >(["referral-history"], "/referrals/my-history", {
      staleTime: 1000 * 60 * 5,
    }),

  useApplyReferralCode: () =>
    useAPIMutation<
      {
        success: boolean;
        discountPercent: number;
        referrerClinicName: string;
      },
      { referralCode: string; email?: string }
    >("/referrals/apply", "POST"),

  useValidateReferralCode: (code: string) =>
    useAPIQuery<{
      valid: boolean;
      referrerName?: string;
      discountPercent?: number;
    }>(["validate-referral", code], `/referrals/validate/${code}`, {
      enabled: !!code && code.length >= 6,
      staleTime: 1000 * 60,
    }),

  // ========== AI FEATURES (Phase 1) ==========

  useAIPrescriptionAnalysis: () =>
    useAPIMutation<
      {
        drugInteractions: Array<{
          drug1: string;
          drug2: string;
          severity: "mild" | "moderate" | "severe";
          description: string;
        }>;
        contraindications: Array<{
          medication: string;
          condition: string;
          description: string;
        }>;
        dosageRecommendations: Array<{
          medication: string;
          status: "appropriate" | "high" | "low";
          recommendation: string;
        }>;
      },
      {
        medications: Array<{ name: string; dosage: string }>;
        patientAge?: number;
        patientAllergies?: string[];
        existingConditions?: string[];
      }
    >("/ai/prescription-analysis", "POST"),

  useAIDiagnosisSuggestions: () =>
    useAPIMutation<
      Array<{
        icdCode: string;
        diagnosis: string;
        confidence: number;
        description: string;
      }>,
      { symptoms: string[]; findingsNotes?: string }
    >("/ai/diagnosis-suggestions", "POST"),

  useAIMedicationRecommendations: () =>
    useAPIMutation<
      Array<{
        medicationName: string;
        strength: string;
        frequency: string;
        indication: string;
        confidence: number;
      }>,
      { condition: string; patientAge?: number; allergies?: string[] }
    >("/ai/medication-recommendations", "POST"),

  // ========== ANALYTICS FEATURES (Phase 1) ==========

  useRevenueMetrics: (
    clinicId: string,
    period: "daily" | "weekly" | "monthly" = "monthly",
    startDate?: Date,
    endDate?: Date,
  ) =>
    useAPIQuery<
      Array<{
        date: string;
        totalRevenue: number;
        invoiceCount: number;
        avgInvoiceAmount: number;
      }>
    >(
      [
        "revenue-metrics",
        clinicId,
        period,
        startDate?.toISOString() || "",
        endDate?.toISOString() || "",
      ],
      `/analytics/revenue-metrics?clinicId=${clinicId}&period=${period}${startDate ? `&startDate=${startDate.toISOString()}` : ""}${endDate ? `&endDate=${endDate.toISOString()}` : ""}`,
      { staleTime: 1000 * 60 * 5 },
    ),

  useAppointmentMetrics: (
    clinicId: string,
    period: "daily" | "weekly" | "monthly" = "monthly",
    startDate?: Date,
    endDate?: Date,
  ) =>
    useAPIQuery<{
      total: number;
      booked: number;
      completed: number;
      cancelled: number;
      noShow: number;
      fillRate: number;
      completionRate: number;
    }>(
      [
        "appointment-metrics",
        clinicId,
        period,
        startDate?.toISOString() || "",
        endDate?.toISOString() || "",
      ],
      `/analytics/appointment-metrics?clinicId=${clinicId}&period=${period}${startDate ? `&startDate=${startDate.toISOString()}` : ""}${endDate ? `&endDate=${endDate.toISOString()}` : ""}`,
      { staleTime: 1000 * 60 * 5 },
    ),

  usePatientDemographics: (
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) =>
    useAPIQuery<{
      totalPatients: number;
      newPatients: number;
      ageDistribution: Record<string, number>;
      genderDistribution: Record<string, number>;
    }>(
      [
        "patient-demographics",
        clinicId,
        startDate?.toISOString() || "",
        endDate?.toISOString() || "",
      ],
      `/analytics/patient-demographics?clinicId=${clinicId}${startDate ? `&startDate=${startDate.toISOString()}` : ""}${endDate ? `&endDate=${endDate.toISOString()}` : ""}`,
      { staleTime: 1000 * 60 * 5 },
    ),

  useTopConditions: (clinicId: string, limit: number = 10) =>
    useAPIQuery<
      Array<{
        condition: string;
        count: number;
        percentage: number;
      }>
    >(
      ["top-conditions", clinicId, limit.toString()],
      `/analytics/top-conditions?clinicId=${clinicId}&limit=${limit}`,
      { staleTime: 1000 * 60 * 5 },
    ),

  // ========== BULK IMPORT FEATURES (Phase 1) ==========

  useBulkImportTemplate: (entityType: string) =>
    useAPIQuery<{ template: string; format: string }>(
      ["import-template", entityType],
      `/imports/template?entityType=${entityType}`,
      { staleTime: 1000 * 60 * 60 }, // Cache for 1 hour
    ),

  useBulkImport: () =>
    useAPIMutation<
      { jobId: string; status: string; totalRows: number },
      { entityType: string; fileName: string; fileBuffer: Buffer }
    >("/imports/bulk", "POST"),

  // ========== AUDIT LOG FEATURES (Phase 1) ==========

  useAuditLogs: (
    clinicId?: string,
    actionType?: string,
    startDate?: Date,
    endDate?: Date,
    options?: UseQueryOptions<
      Array<{
        id: string;
        clinicId: string;
        userId: string;
        action: string;
        entityType: string;
        createdAt: Date;
      }>
    >,
  ) =>
    useAPIQuery<
      Array<{
        id: string;
        clinicId: string;
        userId: string;
        action: string;
        entityType: string;
        createdAt: Date;
      }>
    >(
      [
        "audit-logs",
        clinicId || "",
        actionType || "",
        startDate?.toISOString() || "",
        endDate?.toISOString() || "",
      ],
      `/audit-logs?${clinicId ? `clinicId=${clinicId}&` : ""}${actionType ? `actionType=${actionType}&` : ""}${startDate ? `startDate=${startDate.toISOString()}&` : ""}${endDate ? `endDate=${endDate.toISOString()}` : ""}`,
      { staleTime: 1000 * 60, ...options },
    ),
};
