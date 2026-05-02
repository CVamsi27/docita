import type { DashboardStats } from "@workspace/types";

export function startOfTomorrow(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

/** Upcoming API rows are same-day onward; keep only after local tomorrow 00:00 to avoid duplicating today's schedule. */
export function filterUpcomingBeyondToday(
  upcoming: DashboardStats["upcomingAppointments"],
): DashboardStats["upcomingAppointments"] {
  const cutoff = startOfTomorrow();
  return upcoming.filter((a) => new Date(a.startTime) >= cutoff);
}
