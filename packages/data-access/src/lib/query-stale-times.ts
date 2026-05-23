/** Shared React Query stale times (ms) for clinic-scoped reads. */
export const QUERY_STALE_TIMES = {
  clinicSettings: 10 * 60_000,
  featureFlags: 10 * 60_000,
  dashboard: 5 * 60_000,
  billingList: 60_000,
  appointmentsCalendar: 30_000,
} as const;
