import type { AppointmentListItem } from "@workspace/data-access";
import {
  appointmentStatusSchema,
  type AppointmentStatus,
} from "@workspace/types";
import type { StatusType } from "@workspace/ui/components/indicators/status-badge";

export const REQUESTS_PANEL_FOCUS_PARAM = "requestsPanel";

export interface AppointmentSummaryBreakdown {
  /** Canonical status this row counts, so callers can localize or filter. */
  appointmentStatus: AppointmentStatus;
  value: number;
  /** Badge tone for the row's status dot. */
  tone: StatusType;
}

export interface AppointmentSummary {
  total: number;
  breakdown: AppointmentSummaryBreakdown[];
}

/**
 * Badge tone per status, declared as a total `Record` on purpose: adding a
 * status to `appointmentStatusSchema` fails this map at build time until a tone
 * is picked, so a new status can never silently drop out of the summary bar.
 */
const SUMMARY_STATUS_TONES: Record<AppointmentStatus, StatusType> = {
  scheduled: "scheduled",
  confirmed: "confirmed",
  "checked-in": "success",
  "in-progress": "in-progress",
  completed: "completed",
  cancelled: "cancelled",
  "no-show": "warning",
};

/**
 * Counts appointments by status for the summary bar.
 *
 * Rows are generated from `appointmentStatusSchema` rather than hand-listed, so
 * the breakdown always accounts for the full status domain and its values sum
 * to `total`. A previous hand-written list covered only five of the seven
 * statuses, so cancelled and no-show appointments were counted in `total` with
 * no row to explain them — a clinician saw rows summing well below the stated
 * count. Zero-count rows stay hidden.
 *
 * Pure and locale-free: it returns the canonical status key, and
 * `AppointmentSummaryBar` turns that into display copy. An earlier version
 * returned a pre-rendered English label, which pinned the bar to English.
 */
export function computeAppointmentSummary(
  appointments: AppointmentListItem[],
): AppointmentSummary {
  const counts = new Map<AppointmentStatus, number>();
  for (const appointment of appointments) {
    counts.set(
      appointment.status,
      (counts.get(appointment.status) ?? 0) + 1,
    );
  }

  const breakdown = appointmentStatusSchema.options
    .map((appointmentStatus) => ({
      appointmentStatus,
      value: counts.get(appointmentStatus) ?? 0,
      tone: SUMMARY_STATUS_TONES[appointmentStatus],
    }))
    .filter((item) => item.value > 0);

  return { total: appointments.length, breakdown };
}