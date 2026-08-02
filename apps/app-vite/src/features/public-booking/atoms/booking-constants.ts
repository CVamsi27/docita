import type { TimelineItem } from "@workspace/ui/components/data-display/timeline";
import type { PublicBookingSlotListEmptyReason } from "@workspace/types";

export const bookingCardClass = "gap-0 overflow-hidden py-0 sm:gap-0 sm:py-0";

/** Origin-style outer chrome for major booking tiles */
export const bookingSectionShell =
  "rounded-[var(--radius-lg)] border border-border/60 bg-card shadow-sm overflow-hidden";

/** Muted header strip for CardHeader regions */
export const bookingSectionHeaderBar =
  "border-b border-border/50 bg-surface-2";

export const bookingSteps = [
  "Choose a preferred day (optionally doctor/time)",
  "Share your contact details",
  "Send the request for confirmation",
] as const;

export function publicBookingSlotEmptyMessage(
  reason: PublicBookingSlotListEmptyReason | undefined,
): string {
  switch (reason) {
    case "FULL_DAY_BLOCKED":
      return "This doctor is marked away for the full day you selected. Choose another date on the calendar.";
    case "DATE_PARSE_ERROR":
      return "That date could not be read correctly. Pick the day again on the calendar.";
    case "NO_SLOTS_IN_RANGE":
      return "Visit hours look incomplete for this day (no time slots could be built from the schedule). Please contact the clinic.";
    case "NO_WEEKLY_HOURS":
    default:
      return "No visit hours are set for this weekday for this doctor or clinic (using the clinic time zone). Try another day, or contact the clinic. Clinic staff can configure facility weekly hours in Docita (onboarding or facility settings) if online booking should be available.";
  }
}

export function formatAppointmentStatus(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: "Scheduled",
    CONFIRMED: "Confirmed",
    RESCHEDULING: "Rescheduling",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No show",
  };
  return map[status] ?? status;
}

export function appointmentTimelineAccent(status: string): NonNullable<
  TimelineItem["accent"]
> {
  switch (status) {
    case "COMPLETED":
    case "CONFIRMED":
      return "success";
    case "CANCELLED":
    case "NO_SHOW":
      return "danger";
    case "SCHEDULED":
    case "RESCHEDULING":
    case "IN_PROGRESS":
      return "warning";
    default:
      return "default";
  }
}
