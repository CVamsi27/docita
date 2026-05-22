const STALE_TIME_BY_KEY_PREFIX: Record<string, number> = {
  patients: 60 * 1000,
  appointments: 60 * 1000,
  invoices: 60 * 1000,
  prescriptions: 60 * 1000,
  dashboard: 30 * 1000,
  analytics: 30 * 1000,
  "appointment-queue": 15 * 1000,
  doctors: 5 * 60 * 1000,
  clinic: 5 * 60 * 1000,
  "doctor-profile": 5 * 60 * 1000,
  settings: 5 * 60 * 1000,
  permissions: 5 * 60 * 1000,
};

export function inferStaleTime(
  key: readonly (string | number | Record<string, unknown>)[],
): number | undefined {
  const prefix = typeof key[0] === "string" ? key[0] : undefined;
  if (!prefix) return undefined;
  return STALE_TIME_BY_KEY_PREFIX[prefix];
}
