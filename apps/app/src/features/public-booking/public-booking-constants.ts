export const PUBLIC_BOOKING_SUBMIT_FIELD_KEYS = new Set([
  "phoneNumber",
  "firstName",
  "lastName",
  "dateOfBirth",
  "email",
  "preferredDoctorId",
  "slotCalendarDate",
  "requestedSlotStart",
  "requestedSlotEnd",
  "reason",
  "notes",
  "turnstileToken",
  "bookingVerificationToken",
]);


export const ANY_DOCTOR_ID = "__ANY__";

export type PublicBookingMobileStep = "visit" | "contact" | "review";

/** Focus targets for review step “Edit” links (must match element `id`s). */
export const PUBLIC_BOOKING_STEP_FIELD_FOCUS_IDS = {
  doctor: "pb-doctor-select",
  preferredDay: "pb-preferred-day",
  openTimes: "pb-open-times",
  firstName: "pb-first-name",
  phone: "pb-phone",
  reason: "pb-reason",
} as const;

/**
 * Mobile wizard strip sticks below `PublicBookingTopChrome`:
 * `max(0.625rem, safe-area-top)` + inner row (`h-9` 2.25rem) + bottom padding (`pb-1.5`/`sm:pb-2`).
 */
export const PUBLIC_BOOKING_MOBILE_WIZARD_HEADER_STICKY_CLASS =
  "sticky top-[calc(max(0.625rem,env(safe-area-inset-top))+2.625rem)] sm:top-[calc(max(0.625rem,env(safe-area-inset-top))+2.75rem)]";

/**
 * Minimal tail below step content on mobile. Do not reserve the full dock height here —
 * that created a large empty gap before the footer; clearance lives on the footer instead.
 */
export const PUBLIC_BOOKING_MOBILE_CONTENT_TAIL_PAD_CLASS = "pb-3";

/**
 * Scroll padding below the footer so the last lines clear the fixed dock (visit/contact steps —
 * shorter dock).
 */
export const PUBLIC_BOOKING_MOBILE_DOCK_FOOTER_PAD_VISIT_CONTACT_CLASS =
  "pb-[calc(8.25rem+env(safe-area-inset-bottom))]";

/** Review step: taller dock (Back + compact submit card). */
export const PUBLIC_BOOKING_MOBILE_DOCK_FOOTER_PAD_REVIEW_CLASS =
  "pb-[calc(13.75rem+env(safe-area-inset-bottom))]";

/** Works with `md:sticky` on the tablet/desktop summary aside (below `PublicBookingTopChrome`). */
export const PUBLIC_BOOKING_DESKTOP_RAIL_TOP_OFFSET_CLASS =
  "md:top-[calc(max(0.625rem,env(safe-area-inset-top))+2.625rem)] lg:top-[calc(max(0.625rem,env(safe-area-inset-top))+2.75rem)]";

/** Top chrome + approximate progress header height when both are sticky on narrow viewports. */
export const PUBLIC_BOOKING_STEP_HEADING_SCROLL_MARGIN_CLASS =
  "scroll-mt-[calc(max(0.625rem,env(safe-area-inset-top))+6.25rem)] sm:scroll-mt-[calc(max(0.625rem,env(safe-area-inset-top))+6.5rem)]";

export const PUBLIC_BOOKING_MAIN_CONTENT_ID = "public-booking-main";
