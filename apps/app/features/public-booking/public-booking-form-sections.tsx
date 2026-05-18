/**
 * Barrel re-export — keeps callers unchanged while each section lives in its own file.
 * All public-booking form sections are ≤ 400 lines individually.
 */
export { AppointmentDetailsSection as PublicBookingAppointmentSection } from "@/features/public-booking/sections/AppointmentDetailsSection";
export { ContactSection as PublicBookingContactSection } from "@/features/public-booking/sections/ContactSection";
export { PublicBookingPatientContextSection } from "@/features/public-booking/sections/PatientContextSection";
export { PublicBookingSubmitAlerts } from "@/features/public-booking/sections/SubmitAlertsSection";
export { PublicBookingTurnstileSection } from "@/features/public-booking/sections/TurnstileSection";
