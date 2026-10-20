/**
 * Shared Prisma `include` shapes for patient-facing WhatsApp notification
 * lookups. `SystemEventsService` and `WhatsAppAutomationService` each load
 * the same prescription/invoice projections before sending their respective
 * templates — composing both from these constants keeps the projections
 * from drifting apart between the two send paths.
 */
const NOTIFICATION_PATIENT_CONTACT_SELECT = {
  firstName: true,
  lastName: true,
  phoneNumber: true,
} as const;

/**
 * Same contact projection plus `id` — needed by sends that log the outbound
 * message (`logOutboundPatientTemplate`) or that resend to a specific patient
 * record (`ResendService`), both of which key off `patient.id`.
 */
export const NOTIFICATION_PATIENT_CONTACT_WITH_ID_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
} as const;

const NOTIFICATION_CLINIC_NAME_CURRENCY_SELECT = {
  name: true,
  currency: true,
} as const;

export const APPOINTMENT_NOTIFICATION_INCLUDE = {
  patient: { select: NOTIFICATION_PATIENT_CONTACT_WITH_ID_SELECT },
  clinic: { select: { name: true, timezone: true } },
} as const;

export const PRESCRIPTION_NOTIFICATION_INCLUDE = {
  patient: { select: NOTIFICATION_PATIENT_CONTACT_SELECT },
  doctor: { select: { name: true } },
  appointment: {
    include: { clinic: { select: NOTIFICATION_CLINIC_NAME_CURRENCY_SELECT } },
  },
} as const;

export const INVOICE_NOTIFICATION_INCLUDE = {
  patient: { select: NOTIFICATION_PATIENT_CONTACT_SELECT },
  appointment: {
    include: { clinic: { select: NOTIFICATION_CLINIC_NAME_CURRENCY_SELECT } },
  },
} as const;
