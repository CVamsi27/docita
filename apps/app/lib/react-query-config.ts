/**
 * Query Configuration Constants
 * Defines appropriate staleTime and gcTime values for different data types
 * This helps prevent unnecessary refetches while keeping critical data fresh
 */

export const QUERY_STALE_TIMES = {
  // Real-time/highly dynamic data (refetch frequently)
  APPOINTMENT_QUEUE: 15 * 1000, // 15 seconds - patient queue changes fast
  CLINIC_QUEUE: 15 * 1000, // 15 seconds - clinic queue updates
  PAYMENT_STATUS: 10 * 1000, // 10 seconds - payment processing status
  
  // Dashboard/analytics (moderate update frequency)
  DASHBOARD: 30 * 1000, // 30 seconds - dashboard metrics
  ANALYTICS: 30 * 1000, // 30 seconds - analytics data
  TODAY_APPOINTMENTS: 30 * 1000, // 30 seconds - today's schedule
  
  // Lists (lower update frequency, moderate importance)
  PATIENT_LIST: 60 * 1000, // 1 minute - patient lists
  APPOINTMENTS_LIST: 60 * 1000, // 1 minute - appointment lists
  INVOICES_LIST: 60 * 1000, // 1 minute - invoice lists
  PRESCRIPTIONS_LIST: 60 * 1000, // 1 minute - prescription lists
  
  // Static/reference data (rarely changes)
  CLINIC_SETTINGS: 5 * 60 * 1000, // 5 minutes - clinic config
  DOCTORS_LIST: 5 * 60 * 1000, // 5 minutes - doctor directory
  REFERENCE_DATA: 5 * 60 * 1000, // 5 minutes - reference codes, etc
  
  // User-specific but stable data
  CURRENT_USER: 5 * 60 * 1000, // 5 minutes - user profile
  USER_PERMISSIONS: 5 * 60 * 1000, // 5 minutes - user permissions
  USER_PREFERENCES: 5 * 60 * 1000, // 5 minutes - user settings
} as const;

export const QUERY_GC_TIMES = {
  // Keep real-time data for short duration (user might not return)
  SHORT: 2 * 60 * 1000, // 2 minutes
  
  // Standard duration
  DEFAULT: 5 * 60 * 1000, // 5 minutes
  
  // Keep critical data longer
  LONG: 30 * 60 * 1000, // 30 minutes
  
  // Keep reference data for entire session
  VERY_LONG: 2 * 60 * 60 * 1000, // 2 hours
} as const;

/**
 * Get recommended staleTime for a query type
 * @param dataType - The type of data being queried
 * @returns staleTime in milliseconds
 */
export function getStaleTime(
  dataType: keyof typeof QUERY_STALE_TIMES = 'PATIENT_LIST',
): number {
  return QUERY_STALE_TIMES[dataType];
}

/**
 * Get recommended gcTime (cache duration) for a query type
 * @param cacheType - The cache duration category
 * @returns gcTime in milliseconds
 */
export function getGcTime(
  cacheType: keyof typeof QUERY_GC_TIMES = 'DEFAULT',
): number {
  return QUERY_GC_TIMES[cacheType];
}

/**
 * Get complete query options for a data type
 * Useful for applying consistent staleTime and gcTime across related queries
 */
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
