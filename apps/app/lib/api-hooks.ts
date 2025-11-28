import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query"
import { API_URL } from "./api"
import {
    Patient,
    Appointment,
    CreatePatientInput,
    CreateAppointmentInput,
} from "@workspace/types"

// Placeholder types for missing ones
type Prescription = any
type Invoice = any
type UpdatePatientInput = any
type UpdateAppointmentInput = any
type CreatePrescriptionInput = any
type CreateInvoiceInput = any

// Document types
interface Document {
    id: string
    patient: { name: string }
    createdAt: string
    type: string
    fileName: string
}

// Analytics types
interface AnalyticsOverview {
    totalPatients: number
    totalAppointments: number
    totalRevenue: number
    [key: string]: unknown
}

interface DiseaseTrend {
    disease: string
    count: number
    percentage: number
    [key: string]: unknown
}

interface RevenueByCPT {
    cptCode: string
    description: string
    count: number
    revenue: number
    [key: string]: unknown
}

interface ComplianceMetric {
    metric: string
    value: number
    status: string
    [key: string]: unknown
}

// Medical Coding types
interface ICDCode {
    code: string
    description: string
    category?: string
    [key: string]: unknown
}

interface CPTCode {
    code: string
    description: string
    category?: string
    price?: number
    [key: string]: unknown
}

interface ICDFavorite {
    id: string
    code: string
    description: string
    [key: string]: unknown
}

interface CPTFavorite {
    id: string
    code: string
    description: string
    [key: string]: unknown
}

// Generic fetch function with error handling
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "An error occurred" }))
        throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
}

// Reusable query hook
export function useAPIQuery<T>(
    key: string[],
    endpoint: string,
    options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
    return useQuery<T>({
        queryKey: key,
        queryFn: () => fetchAPI<T>(endpoint),
        ...options,
    })
}

// Reusable mutation hook
export function useAPIMutation<TData, TVariables>(
    endpoint: string,
    method: "POST" | "PUT" | "DELETE" | "PATCH" = "POST",
    options?: UseMutationOptions<TData, Error, TVariables>
) {
    const queryClient = useQueryClient()

    return useMutation<TData, Error, TVariables>({
        mutationFn: (variables) =>
            fetchAPI<TData>(endpoint, {
                method,
                body: JSON.stringify(variables),
            }),
        onSuccess: (data, variables, context) => {
            // Invalidate relevant queries
            (queryClient as any).invalidateQueries({})
                (options?.onSuccess as any)?.(data, variables, context)
        },
        ...options,
    })
}

// Specific API hooks
export const apiHooks = {
    // Dashboard
    useDashboardStats: () => useAPIQuery<any>(["dashboard-stats"], "/dashboard/stats"),

    // Patients
    usePatients: () => useAPIQuery<Patient[]>(["patients"], "/patients"),
    usePatient: (id: string) => useAPIQuery<Patient>(["patients", id], `/patients/${id}`),
    useCreatePatient: () => useAPIMutation<Patient, CreatePatientInput>("/patients", "POST"),
    useUpdatePatient: (id: string) => useAPIMutation<Patient, UpdatePatientInput>(`/patients/${id}`, "PUT"),
    useDeletePatient: (id: string) => useAPIMutation<void, void>(`/patients/${id}`, "DELETE"),

    // Appointments
    useAppointments: () => useAPIQuery<(Appointment & { patient?: Patient })[]>(["appointments"], "/appointments"),
    useAppointment: (id: string) => useAPIQuery<Appointment & { patient?: Patient }>(["appointments", id], `/appointments/${id}`),
    useCreateAppointment: () => useAPIMutation<Appointment, CreateAppointmentInput>("/appointments", "POST"),
    useUpdateAppointment: (id: string) => useAPIMutation<Appointment, UpdateAppointmentInput>(`/appointments/${id}`, "PUT"),

    // Prescriptions
    usePrescriptions: () => useAPIQuery<(Prescription & { patient: Patient })[]>(["prescriptions"], "/prescriptions"),
    usePrescription: (id: string) => useAPIQuery<Prescription & { patient: Patient }>(["prescriptions", id], `/prescriptions/${id}`),
    useCreatePrescription: () => useAPIMutation<Prescription, CreatePrescriptionInput>("/prescriptions", "POST"),

    // Invoices
    useInvoices: () => useAPIQuery<(Invoice & { patient: Patient; appointment?: { doctor: { name: string } } })[]>(["invoices"], "/invoices"),
    useInvoice: (id: string) => useAPIQuery<Invoice & { patient: Patient }>(["invoices", id], `/invoices/${id}`),
    useCreateInvoice: () => useAPIMutation<Invoice, CreateInvoiceInput>("/invoices", "POST"),

    // Documents
    useDocuments: () => useAPIQuery<Document[]>(["documents"], "/documents"),
    useDocument: (id: string) => useAPIQuery<Document>(["documents", id], `/documents/${id}`),

    // Analytics
    useAnalyticsOverview: () => useAPIQuery<AnalyticsOverview>(["analytics", "overview"], "/analytics/overview"),
    useDiseaseTrends: (clinicId: string, startDate?: string, endDate?: string) => {
        const params = new URLSearchParams({ clinicId })
        if (startDate) params.append("startDate", startDate)
        if (endDate) params.append("endDate", endDate)
        return useAPIQuery<DiseaseTrend[]>(
            ["analytics", "disease-trends", clinicId, startDate || "", endDate || ""],
            `/analytics/disease-trends?${params}`
        )
    },
    useRevenueByCPT: (clinicId: string, startDate?: string, endDate?: string) => {
        const params = new URLSearchParams({ clinicId })
        if (startDate) params.append("startDate", startDate)
        if (endDate) params.append("endDate", endDate)
        return useAPIQuery<RevenueByCPT[]>(
            ["analytics", "revenue-cpt", clinicId, startDate || "", endDate || ""],
            `/analytics/revenue/by-cpt?${params}`
        )
    },
    useComplianceMetrics: (clinicId: string, startDate?: string, endDate?: string) => {
        const params = new URLSearchParams({ clinicId })
        if (startDate) params.append("startDate", startDate)
        if (endDate) params.append("endDate", endDate)
        return useAPIQuery<ComplianceMetric[]>(
            ["analytics", "compliance", clinicId, startDate || "", endDate || ""],
            `/analytics/compliance/metrics?${params}`
        )
    },

    // Medical Coding
    useICDCodes: (search: string) =>
        useAPIQuery<ICDCode[]>(["icd-codes", search], `/medical-coding/icd-codes?search=${encodeURIComponent(search)}`),
    useCPTCodes: (search: string) =>
        useAPIQuery<CPTCode[]>(["cpt-codes", search], `/medical-coding/cpt-codes?search=${encodeURIComponent(search)}`),
    useICDFavorites: () => useAPIQuery<ICDFavorite[]>(["icd-favorites"], "/medical-coding/favorites"),
    useCPTFavorites: () => useAPIQuery<CPTFavorite[]>(["cpt-favorites"], "/medical-coding/cpt-favorites"),
    useAddICDFavorite: () => useAPIMutation("/medical-coding/favorites", "POST"),
    useRemoveICDFavorite: (id: string) => useAPIMutation(`/medical-coding/favorites/${id}`, "DELETE"),
    useAddCPTFavorite: () => useAPIMutation("/medical-coding/cpt-favorites", "POST"),
    useRemoveCPTFavorite: (id: string) => useAPIMutation(`/medical-coding/cpt-favorites/${id}`, "DELETE"),

    // Consultation & Observations
    useUpdateAppointmentObservations: (id: string) =>
        useAPIMutation<Appointment, any>(`/appointments/${id}`, "PUT"),
    useSaveVitals: (appointmentId: string) =>
        useAPIMutation<any, any>(`/appointments/${appointmentId}/vitals`, "POST"),

    // Settings - Clinic
    useClinicSettings: () => useAPIQuery<any>(["clinic", "settings"], "/clinic/settings"),
    useUpdateClinicSettings: () => useAPIMutation<any, any>("/clinic/settings", "PUT"),

    // Settings - Doctors
    useDoctors: () => useAPIQuery<any[]>(["doctors"], "/doctors"),
    useDoctor: (id: string) => useAPIQuery<any>(["doctors", id], `/doctors/${id}`),
    useCreateDoctor: () => useAPIMutation<any, any>("/doctors", "POST"),
    useUpdateDoctor: (id: string) => useAPIMutation<any, any>(`/doctors/${id}`, "PUT"),
    useDeleteDoctor: (id: string) => useAPIMutation<void, void>(`/doctors/${id}`, "DELETE"),

    // Import & OCR
    useImportJobs: () => useAPIQuery<any[]>(["import-jobs"], "/import/jobs"),
    useImportJob: (id: string) => useAPIQuery<any>(["import-jobs", id], `/import/jobs/${id}`),
    useUploadFile: () => useAPIMutation<any, FormData>("/import/upload", "POST"),
    useProcessOCR: () => useAPIMutation<any, any>("/import/ocr/process", "POST"),

    // Coding Queue
    useCodingQueue: () => useAPIQuery<any[]>(["coding-queue"], "/coding-queue"),
    useUpdateVisitCoding: (visitId: string) =>
        useAPIMutation<any, any>(`/visits/${visitId}/coding`, "PUT"),

    // Invoice operations
    useUpdateInvoice: (id: string) => useAPIMutation<Invoice, any>(`/invoices/${id}`, "PUT"),
    useDeleteInvoice: (id: string) => useAPIMutation<void, void>(`/invoices/${id}`, "DELETE"),

    // Prescription operations
    useUpdatePrescription: (id: string) => useAPIMutation<Prescription, any>(`/prescriptions/${id}`, "PUT"),
    useDeletePrescription: (id: string) => useAPIMutation<void, void>(`/prescriptions/${id}`, "DELETE"),

    // Templates
    useTemplates: () => useAPIQuery<any[]>(["templates"], "/templates"),
}
