import { z } from "zod";

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response wrapper for successful responses
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z
      .object({
        requestId: z.string().optional(),
        timestamp: z.string().optional(),
      })
      .optional(),
  });

/**
 * Paginated response with cursor-based pagination
 */
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().optional(),
    hasMore: z.boolean(),
    count: z.number().optional(),
  });

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count?: number;
};

// ============================================================================
// Error Codes
// ============================================================================

export const appErrorCodeSchema = z.enum([
  // Authentication & Authorization
  "UNAUTHORIZED",
  "FORBIDDEN",
  "TOKEN_EXPIRED",
  "INVALID_CREDENTIALS",

  // Resource Errors
  "NOT_FOUND",
  "PATIENT_NOT_FOUND",
  "APPOINTMENT_NOT_FOUND",
  "DOCTOR_NOT_FOUND",
  "CLINIC_NOT_FOUND",
  "PRESCRIPTION_NOT_FOUND",
  "INVOICE_NOT_FOUND",
  "DOCUMENT_NOT_FOUND",

  // Validation Errors
  "VALIDATION_ERROR",
  "INVALID_INPUT",
  "DUPLICATE_ENTRY",
  "INVALID_DATE_RANGE",

  // Business Logic Errors
  "APPOINTMENT_CONFLICT",
  "SLOT_UNAVAILABLE",
  "INSUFFICIENT_PERMISSIONS",
  "SUBSCRIPTION_LIMIT_REACHED",
  "LICENSE_EXPIRED",
  "FEATURE_NOT_AVAILABLE",

  // System Errors
  "INTERNAL_ERROR",
  "DATABASE_ERROR",
  "EXTERNAL_SERVICE_ERROR",
  "RATE_LIMIT_EXCEEDED",
]);

export type AppErrorCode = z.infer<typeof appErrorCodeSchema>;

/**
 * User-friendly error messages for each error code
 */
export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  // Authentication & Authorization
  UNAUTHORIZED: "Please log in to continue",
  FORBIDDEN: "You do not have permission to perform this action",
  TOKEN_EXPIRED: "Your session has expired. Please log in again",
  INVALID_CREDENTIALS: "Invalid email or password",

  // Resource Errors
  NOT_FOUND: "The requested resource was not found",
  PATIENT_NOT_FOUND: "Patient not found",
  APPOINTMENT_NOT_FOUND: "Appointment not found",
  DOCTOR_NOT_FOUND: "Doctor not found",
  CLINIC_NOT_FOUND: "Clinic not found",
  PRESCRIPTION_NOT_FOUND: "Prescription not found",
  INVOICE_NOT_FOUND: "Invoice not found",
  DOCUMENT_NOT_FOUND: "Document not found",

  // Validation Errors
  VALIDATION_ERROR: "Please check your input and try again",
  INVALID_INPUT: "The provided data is invalid",
  DUPLICATE_ENTRY: "A record with this information already exists",
  INVALID_DATE_RANGE: "The selected date range is invalid",

  // Business Logic Errors
  APPOINTMENT_CONFLICT: "This time slot conflicts with an existing appointment",
  SLOT_UNAVAILABLE: "The selected time slot is no longer available",
  INSUFFICIENT_PERMISSIONS: "You do not have the required permissions",
  SUBSCRIPTION_LIMIT_REACHED:
    "You have reached the limit for your subscription tier",
  LICENSE_EXPIRED: "Your medical license has expired",
  FEATURE_NOT_AVAILABLE: "This feature is not available in your plan",

  // System Errors
  INTERNAL_ERROR: "An unexpected error occurred. Please try again",
  DATABASE_ERROR: "A database error occurred. Please try again",
  EXTERNAL_SERVICE_ERROR: "An external service is unavailable",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please wait and try again",
};

/**
 * Standard API error response
 */
export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: appErrorCodeSchema,
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
  meta: z
    .object({
      requestId: z.string().optional(),
      timestamp: z.string().optional(),
    })
    .optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

/**
 * Helper to create a typed API response
 */
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      meta?: { requestId?: string; timestamp?: string };
    }
  | ApiError;

// ============================================================================
// API Routes Constants
// ============================================================================

export const API_ROUTES = {
  // Auth
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
    me: "/auth/me",
  },

  // Patients
  patients: {
    list: "/patients",
    get: (id: string) => `/patients/${id}`,
    create: "/patients",
    update: (id: string) => `/patients/${id}`,
    delete: (id: string) => `/patients/${id}`,
    appointments: (id: string) => `/patients/${id}/appointments`,
    documents: (id: string) => `/patients/${id}/documents`,
  },

  // Appointments
  appointments: {
    list: "/appointments",
    get: (id: string) => `/appointments/${id}`,
    create: "/appointments",
    update: (id: string) => `/appointments/${id}`,
    delete: (id: string) => `/appointments/${id}`,
  },

  // Doctors
  doctors: {
    list: "/doctors",
    get: (id: string) => `/doctors/${id}`,
    availability: (id: string) => `/doctors/${id}/availability`,
    schedules: (id: string) => `/doctors/${id}/schedules`,
  },

  // Prescriptions
  prescriptions: {
    list: "/prescriptions",
    get: (id: string) => `/prescriptions/${id}`,
    create: "/prescriptions",
  },

  // Invoices
  invoices: {
    list: "/invoices",
    get: (id: string) => `/invoices/${id}`,
    create: "/invoices",
    update: (id: string) => `/invoices/${id}`,
  },

  // Documents
  documents: {
    list: "/documents",
    get: (id: string) => `/documents/${id}`,
    upload: "/documents/upload",
  },

  // Dashboard
  dashboard: {
    stats: "/dashboard",
  },

  // Clinics
  clinics: {
    get: (id: string) => `/clinics/${id}`,
    update: (id: string) => `/clinics/${id}`,
  },

  // Queue
  queue: {
    list: "/queue",
    add: "/queue",
    update: (id: string) => `/queue/${id}`,
  },
} as const;

// ============================================================================
// Request/Response DTO Schemas
// ============================================================================

/**
 * Generic list query parameters
 */
export const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  search: z.string().optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

/**
 * Date range filter for API queries
 */
export const apiDateRangeQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ApiDateRangeQuery = z.infer<typeof apiDateRangeQuerySchema>;
