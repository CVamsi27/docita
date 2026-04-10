import { z } from "zod";

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

export const appErrorCodeSchema = z.enum([

  "UNAUTHORIZED",
  "FORBIDDEN",
  "TOKEN_EXPIRED",
  "INVALID_CREDENTIALS",

  "NOT_FOUND",
  "PATIENT_NOT_FOUND",
  "APPOINTMENT_NOT_FOUND",
  "DOCTOR_NOT_FOUND",
  "CLINIC_NOT_FOUND",
  "PRESCRIPTION_NOT_FOUND",
  "INVOICE_NOT_FOUND",
  "DOCUMENT_NOT_FOUND",

  "VALIDATION_ERROR",
  "INVALID_INPUT",
  "DUPLICATE_ENTRY",
  "INVALID_DATE_RANGE",

  "APPOINTMENT_CONFLICT",
  "SLOT_UNAVAILABLE",
  "INSUFFICIENT_PERMISSIONS",
  "SUBSCRIPTION_LIMIT_REACHED",
  "LICENSE_EXPIRED",
  "FEATURE_NOT_AVAILABLE",

  "INTERNAL_ERROR",
  "DATABASE_ERROR",
  "EXTERNAL_SERVICE_ERROR",
  "RATE_LIMIT_EXCEEDED",
]);

export type AppErrorCode = z.infer<typeof appErrorCodeSchema>;

export const ERROR_MESSAGES: Record<AppErrorCode, string> = {

  UNAUTHORIZED: "Please sign in again to continue",
  FORBIDDEN: "You do not have permission to perform this action",
  TOKEN_EXPIRED: "Please sign in again to continue",
  INVALID_CREDENTIALS: "The email or password is incorrect",

  NOT_FOUND: "We could not find what you were looking for",
  PATIENT_NOT_FOUND: "We could not find that patient",
  APPOINTMENT_NOT_FOUND: "We could not find that appointment",
  DOCTOR_NOT_FOUND: "We could not find that doctor",
  CLINIC_NOT_FOUND: "We could not find that clinic",
  PRESCRIPTION_NOT_FOUND: "We could not find that prescription",
  INVOICE_NOT_FOUND: "We could not find that invoice",
  DOCUMENT_NOT_FOUND: "We could not find that document",

  VALIDATION_ERROR: "Please check the highlighted fields and try again",
  INVALID_INPUT: "Please check the information and try again",
  DUPLICATE_ENTRY: "This information already exists",
  INVALID_DATE_RANGE: "Please choose a valid date range",

  APPOINTMENT_CONFLICT:
    "This time is no longer available. Please choose another time",
  SLOT_UNAVAILABLE: "This time is no longer available. Please choose another time",
  INSUFFICIENT_PERMISSIONS: "You do not have permission to do that",
  SUBSCRIPTION_LIMIT_REACHED:
    "Your current plan has reached its limit for this action",
  LICENSE_EXPIRED: "Please update the license details before continuing",
  FEATURE_NOT_AVAILABLE: "This feature is not available for your account",

  INTERNAL_ERROR: "Something went wrong. Please try again",
  DATABASE_ERROR: "Something went wrong. Please try again",
  EXTERNAL_SERVICE_ERROR: "Something went wrong. Please try again",
  RATE_LIMIT_EXCEEDED: "Too many attempts. Please wait a moment and try again",
};

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

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      meta?: { requestId?: string; timestamp?: string };
    }
  | ApiError;

export const API_ROUTES = {

  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
    me: "/auth/me",
  },

  patients: {
    list: "/patients",
    get: (id: string) => `/patients/${id}`,
    create: "/patients",
    update: (id: string) => `/patients/${id}`,
    delete: (id: string) => `/patients/${id}`,
    appointments: (id: string) => `/patients/${id}/appointments`,
    documents: (id: string) => `/patients/${id}/documents`,
  },

  appointments: {
    list: "/appointments",
    get: (id: string) => `/appointments/${id}`,
    create: "/appointments",
    update: (id: string) => `/appointments/${id}`,
    delete: (id: string) => `/appointments/${id}`,
  },

  doctors: {
    list: "/doctors",
    get: (id: string) => `/doctors/${id}`,
    availability: (id: string) => `/doctors/${id}/availability`,
    schedules: (id: string) => `/doctors/${id}/schedules`,
  },

  prescriptions: {
    list: "/prescriptions",
    get: (id: string) => `/prescriptions/${id}`,
    create: "/prescriptions",
  },

  invoices: {
    list: "/invoices",
    get: (id: string) => `/invoices/${id}`,
    create: "/invoices",
    update: (id: string) => `/invoices/${id}`,
  },

  documents: {
    list: "/documents",
    get: (id: string) => `/documents/${id}`,
    upload: "/documents/upload",
  },

  dashboard: {
    stats: "/dashboard",
  },

  clinics: {
    get: (id: string) => `/clinics/${id}`,
    update: (id: string) => `/clinics/${id}`,
    searchForJoin: "/clinics/search-for-join",
    joinRequests: {
      create: "/clinics/join-requests",
      list: "/clinics/join-requests",
      mine: "/clinics/join-requests/mine",
      count: "/clinics/join-requests/count",
      approve: (id: string) => `/clinics/join-requests/${id}/approve`,
      reject: (id: string) => `/clinics/join-requests/${id}/reject`,
      withdraw: (id: string) => `/clinics/join-requests/${id}/withdraw`,
    },
  },

  onboarding: {
    choosePath: "/onboarding/choose-path",
  },

  queue: {
    list: "/queue",
    add: "/queue",
    update: (id: string) => `/queue/${id}`,
  },
} as const;

export const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  search: z.string().optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export const apiDateRangeQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ApiDateRangeQuery = z.infer<typeof apiDateRangeQuerySchema>;
