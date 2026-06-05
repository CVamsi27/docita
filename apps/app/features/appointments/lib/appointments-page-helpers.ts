// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external types
import type { AppointmentListItem } from "@workspace/data-access";
import type { StatusType } from "@workspace/ui/components/indicators/status-badge";

export const REQUESTS_PANEL_FOCUS_PARAM = "requestsPanel";

export interface AppointmentSummaryBreakdown {
  label: string;
  value: number;
  status: StatusType;
}

export interface AppointmentSummary {
  total: number;
  breakdown: AppointmentSummaryBreakdown[];
}

export function computeAppointmentSummary(
  appointments: AppointmentListItem[],
): AppointmentSummary {
  const counts = appointments.reduce(
    (acc, appointment) => {
      acc.total += 1;
      acc[appointment.status] = (acc[appointment.status] ?? 0) + 1;
      return acc;
    },
    {
      total: 0,
      scheduled: 0,
      confirmed: 0,
      "checked-in": 0,
      "in-progress": 0,
      completed: 0,
    } as Record<string, number>,
  );

  const breakdown: AppointmentSummaryBreakdown[] = [
    { label: "Scheduled", value: counts.scheduled, status: "scheduled" },
    { label: "Confirmed", value: counts.confirmed, status: "confirmed" },
    { label: "Checked in", value: counts["checked-in"], status: "success" },
    {
      label: "In progress",
      value: counts["in-progress"],
      status: "in-progress",
    },
    { label: "Completed", value: counts.completed, status: "completed" },
  ];

  return {
    total: counts.total,
    breakdown: breakdown.filter((item) => item.value > 0),
  };
}
