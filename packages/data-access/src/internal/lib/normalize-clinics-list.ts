import type { InternalDashboardClinic } from "../dashboard.types";

export function normalizeClinicsList(
  data: InternalDashboardClinic[] | { items?: InternalDashboardClinic[] },
): InternalDashboardClinic[] {
  return Array.isArray(data) ? data : (data.items ?? []);
}
