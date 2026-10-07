import type { TimelineItem } from "@workspace/ui/components/data-display/timeline";
import {
  appointmentStatusSchema,
  type PublicBookingSlotListEmptyReason,
} from "@workspace/types";

/**
 * Statuses this surface can name. The canonical enum drives the list; `booked`
 * is added because the public-booking context endpoint deliberately returns it
 * for a BOOKED appointment (see public-booking-creation.service.spec) even
 * though `appointmentStatusSchema` has no such member.
 *
 * `appointment-status.test.ts` asserts every entry resolves in en and hi.
 */
const APPOINTMENT_STATUS_MESSAGE_KEYS: ReadonlySet<string> = new Set([
  ...appointmentStatusSchema.options,
  "booked",
]);

export const bookingCardClass = "gap-0 overflow-hidden py-0 sm:gap-0 sm:py-0";

/** Origin-style outer chrome for major booking tiles */
export const bookingSectionShell =
  "rounded-[var(--radius-lg)] border border-border/60 bg-card shadow-sm overflow-hidden";

/** Muted header strip for CardHeader regions */
export const bookingSectionHeaderBar =
  "border-b border-border/50 bg-surface-2";

/**
 * Maps a slot-list empty reason onto its `PublicBooking` catalog key
 * (`slotEmpty.*`) so the caller decides the language. `undefined` means the
 * reason was not supplied, which is the no-weekly-hours case.
 *
 * The returned keys are dynamic, so the namespace-registration test cannot see
 * them at the call site. `slot-empty-keys.test.ts` asserts every branch
 * resolves in both locales instead.
 */
export function publicBookingSlotEmptyKey(
  reason: PublicBookingSlotListEmptyReason | undefined,
): string {
  switch (reason) {
    case "FULL_DAY_BLOCKED":
      return "slotEmpty.FULL_DAY_BLOCKED";
    case "DATE_PARSE_ERROR":
      return "slotEmpty.DATE_PARSE_ERROR";
    case "NO_SLOTS_IN_RANGE":
      return "slotEmpty.NO_SLOTS_IN_RANGE";
    case "NO_WEEKLY_HOURS":
    default:
      return "slotEmpty.NO_WEEKLY_HOURS";
  }
}

/**
 * Canonicalize an appointment status string to the lowercase kebab form used
 * by `appointmentStatusSchema`.
 *
 * The public-booking context endpoint returns statuses through
 * `normalizeBookingStatus` (lowercase + kebab), while the Prisma enum is
 * UPPER_SNAKE_CASE. Mapping used to key off the uppercase spelling only, so
 * every status from the endpoint missed and fell back to showing the raw token
 * to the patient. Normalizing on both sides makes the helpers immune to which
 * layer the value came from.
 */
function normalizeAppointmentStatus(status: string): string {
  return status.trim().toLowerCase().replace(/_/g, "-");
}

/**
 * Catalog key for a patient-visible appointment status, or null when the
 * value is not one this surface can name.
 *
 * Null rather than a raw-token fallback: a status the catalog cannot name must
 * not reach a patient as `no-show`. Callers decide what to render instead.
 *
 * Keys are built at runtime, so the namespace-registration test cannot see
 * them; `appointment-status.test.ts` derives them from the canonical schema
 * and asserts both locales resolve.
 */
export function appointmentStatusKey(status: string): string | null {
  const normalized = normalizeAppointmentStatus(status);
  return APPOINTMENT_STATUS_MESSAGE_KEYS.has(normalized)
    ? `appointmentStatus.${normalized}`
    : null;
}

/**
 * Timeline accent per status.
 *
 * Keyed on the normalized form for the same reason as `appointmentStatusKey`:
 * the endpoint's lowercase spelling previously matched nothing, so completed
 * visits rendered neutral instead of `success` and cancellations rendered
 * neutral instead of `danger`.
 */
export function appointmentTimelineAccent(status: string): NonNullable<
  TimelineItem["accent"]
> {
  switch (normalizeAppointmentStatus(status)) {
    case "completed":
    case "confirmed":
      return "success";
    case "cancelled":
    case "no-show":
      return "danger";
    case "scheduled":
    case "in-progress":
    case "checked-in":
    case "booked":
      return "warning";
    default:
      return "default";
  }
}
