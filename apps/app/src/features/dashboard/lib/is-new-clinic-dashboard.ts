import type { DashboardStats } from "@workspace/types";

/**
 * A clinic with no patients, appointments, or prescriptions yet — both the
 * full dashboard and the "Today" page show a first-patient empty state
 * instead of the populated layout when this is true. Shared so the
 * "what counts as new" rule has a single source of truth.
 */
export function isNewClinicDashboard(
  stats: Pick<
    DashboardStats,
    "totalPatients" | "todayAppointments" | "activePrescriptions"
  >,
): boolean {
  return (
    stats.totalPatients === 0 &&
    stats.todayAppointments === 0 &&
    stats.activePrescriptions === 0
  );
}
