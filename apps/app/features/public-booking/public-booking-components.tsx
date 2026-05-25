/**
 * Barrel re-export — keeps all callers unchanged while each component
 * lives in its own ≤ 400-line atom file under `atoms/`.
 */
export {
  bookingCardClass,
  bookingSectionShell,
  bookingSectionHeaderBar,
  bookingSteps,
  publicBookingSlotEmptyMessage,
  formatAppointmentStatus,
  appointmentTimelineAccent,
} from "@/features/public-booking/atoms/booking-constants";

export { BookingSectionHeader } from "@/features/public-booking/atoms/booking-section-header";
export { PublicBookingSkipLink, PublicBookingTopChrome } from "@/features/public-booking/atoms/public-booking-top-chrome";
export { PublicBookingTrustRow } from "@/features/public-booking/atoms/public-booking-trust-row";
export { PublicBookingPageFooter, PublicBookingPoweredByFooter } from "@/features/public-booking/atoms/public-booking-footer";
export { PublicBookingHeroCompact } from "@/features/public-booking/atoms/public-booking-hero";
export { PublicBookingProgressChrome } from "@/features/public-booking/atoms/booking-progress-chrome";
export { PublicBookingHowItWorksSheet } from "@/features/public-booking/atoms/booking-how-it-works";
export { PublicBookingSummaryPeek } from "@/features/public-booking/atoms/booking-summary-peek";
export { PublicBookingReviewBlock } from "@/features/public-booking/atoms/booking-review-block";
export { PublicBookingDoneCard } from "@/features/public-booking/atoms/booking-done-card";
export { ClinicContactCard } from "@/features/public-booking/atoms/clinic-contact-card";
export { RequestSummaryCard } from "@/features/public-booking/atoms/request-summary-card";
export { BookingActionPanel } from "@/features/public-booking/atoms/booking-action-panel";
export { SlotTimesSkeletonGrid, SlotTimesScrollArea } from "@/features/public-booking/atoms/slot-times";
