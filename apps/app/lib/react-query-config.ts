export const QUERY_STALE_TIMES = {
  APPOINTMENT_QUEUE: 15 * 1000,
  CLINIC_QUEUE: 15 * 1000,
  PAYMENT_STATUS: 10 * 1000,
  DASHBOARD: 30 * 1000,
  ANALYTICS: 30 * 1000,
  TODAY_APPOINTMENTS: 30 * 1000,
  PATIENT_LIST: 60 * 1000,
  APPOINTMENTS_LIST: 60 * 1000,
  INVOICES_LIST: 60 * 1000,
  PRESCRIPTIONS_LIST: 60 * 1000,
  CLINIC_SETTINGS: 5 * 60 * 1000,
  DOCTORS_LIST: 5 * 60 * 1000,
  REFERENCE_DATA: 5 * 60 * 1000,
  CURRENT_USER: 5 * 60 * 1000,
  USER_PERMISSIONS: 5 * 60 * 1000,
  USER_PREFERENCES: 5 * 60 * 1000,
} as const;

export const QUERY_GC_TIMES = {
  SHORT: 2 * 60 * 1000,
  DEFAULT: 5 * 60 * 1000,
  LONG: 30 * 60 * 1000,
  VERY_LONG: 2 * 60 * 60 * 1000,
} as const;

export function getStaleTime(
  dataType: keyof typeof QUERY_STALE_TIMES = "PATIENT_LIST",
): number {
  return QUERY_STALE_TIMES[dataType];
}

export function getGcTime(
  cacheType: keyof typeof QUERY_GC_TIMES = "DEFAULT",
): number {
  return QUERY_GC_TIMES[cacheType];
}

export function getQueryOptions(
  dataType: keyof typeof QUERY_STALE_TIMES,
  options?: {
    refetchOnWindowFocus?: boolean;
    refetchOnMount?: boolean;
  },
) {
  return {
    staleTime: getStaleTime(dataType),
    gcTime: QUERY_GC_TIMES.DEFAULT,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
    refetchOnMount: options?.refetchOnMount ?? true,
  };
}
