import { z } from "zod";
import { stripHtmlTags } from "../api/sanitization";
import { pastDateOfBirthSchema } from "./patients";

export const publicBookingClinicResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    referralCode: z.string(),
    timezone: z.string(),
    /** Street address shown to patients on the public booking page. */
    address: z.string().optional(),
    /** Primary phone shown for this location. */
    phone: z.string().optional(),
    /** Contact email for this location (may differ from login accounts). */
    email: z.string().optional(),
    website: z.string().nullable().optional(),
    /** How the organization is labeled in product copy (clinic vs hospital). */
    facilityLabel: z.enum(["CLINIC", "HOSPITAL"]).optional(),
  })
  .strict();

export const publicBookingDoctorItemSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    specialization: z.string().nullable().optional(),
  })
  .strict();

export const publicBookingDoctorsResponseSchema = z
  .object({
    doctors: z.array(publicBookingDoctorItemSchema),
  })
  .strict();

export const publicBookingSlotItemSchema = z
  .object({
    doctorId: z.string(),
    doctorName: z.string(),
    specialization: z.string().optional(),
    startTime: z.string(),
    endTime: z.string(),
    isAvailable: z.boolean(),
  })
  .strict();

/** Present only when `slots` is empty; explains why nothing was returned. */
export const publicBookingSlotListEmptyReasonSchema = z.enum([
  /** No active DoctorSchedule row for this weekday (clinic timezone). */
  "NO_WEEKLY_HOURS",
  /** Weekly hours exist but the doctor has full-day time off overlapping this date. */
  "FULL_DAY_BLOCKED",
  /** Calendar date could not be resolved in the clinic timezone. */
  "DATE_PARSE_ERROR",
  /** Schedule exists and is not full-day blocked, but no slot windows were produced (misconfigured hours). */
  "NO_SLOTS_IN_RANGE",
]);

export type PublicBookingSlotListEmptyReason = z.infer<
  typeof publicBookingSlotListEmptyReasonSchema
>;

export const publicBookingSlotsResponseSchema = z
  .object({
    slots: z.array(publicBookingSlotItemSchema),
    slotListEmptyReason: publicBookingSlotListEmptyReasonSchema.optional(),
  })
  .strict();

export const publicBookingSlotsQuerySchema = z
  .object({
    doctorId: z.string().min(1).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Optional time window in clinic timezone (HH:mm). */
    rangeStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    /** Optional time window in clinic timezone (HH:mm). */
    rangeEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  })
  .strict();

export const publicBookingPhoneCheckRequestSchema = z
  .object({
    phoneNumber: z.string().min(8).max(32),
    turnstileToken: z.string().min(1).optional(),
  })
  .strict();

export const publicBookingPhoneCheckResponseSchema = z
  .object({
    requiresOtp: z.boolean(),
  })
  .strict();

export const publicBookingOtpRequestSchema = z
  .object({
    phoneNumber: z.string().min(8).max(32),
    turnstileToken: z.string().min(1).optional(),
  })
  .strict();

export const publicBookingOtpRequestResponseSchema = z
  .object({
    message: z.string(),
    expiresInSeconds: z.number().int().nonnegative(),
  })
  .strict();

export const publicBookingOtpVerifySchema = z
  .object({
    phoneNumber: z.string().min(8).max(32),
    otp: z.string().min(4).max(12),
  })
  .strict();

export const publicBookingPatientPrefillSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().nullable().optional(),
  })
  .strict();

export const publicBookingOtpVerifyResponseSchema = z
  .object({
    bookingVerificationToken: z.string().min(1),
    patient: publicBookingPatientPrefillSchema,
  })
  .strict();

export const publicBookingContextAppointmentSchema = z
  .object({
    id: z.string(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    doctorName: z.string().nullable(),
    status: z.string().min(1),
  })
  .strict();

export const publicBookingContextResponseSchema = z
  .object({
    appointments: z.array(publicBookingContextAppointmentSchema),
    patientSince: z.string().datetime().optional(),
  })
  .strict();

export const publicBookingSubmitRequestSchema = z
  .object({
    phoneNumber: z.string().min(8).max(32),
    firstName: z.string().trim().min(1).max(100).transform(stripHtmlTags),
    lastName: z.string().trim().min(1).max(100).transform(stripHtmlTags),
    /** Required when creating a new patient record (phone not on file at this clinic). */
    dateOfBirth: pastDateOfBirthSchema.optional(),
    email: z.string().trim().max(320).email().optional(),
    preferredDoctorId: z.string().min(1).optional(),
    /** Calendar day used when fetching slots (YYYY-MM-DD); must match requested slot instants. */
    slotCalendarDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    requestedSlotStart: z.string().datetime().optional(),
    requestedSlotEnd: z.string().datetime().optional(),
    reason: z.string().trim().max(500).transform(stripHtmlTags).optional(),
    notes: z.string().trim().max(1000).transform(stripHtmlTags).optional(),
    turnstileToken: z.string().min(1).optional(),
    bookingVerificationToken: z.string().min(1).optional(),
  })
  .strict();

export const publicBookingSubmitResponseSchema = z
  .object({
    requestId: z.string(),
    message: z.string(),
  })
  .strict();

export type PublicBookingClinicResponse = z.infer<
  typeof publicBookingClinicResponseSchema
>;
export type PublicBookingDoctorsResponse = z.infer<
  typeof publicBookingDoctorsResponseSchema
>;
export type PublicBookingSlotsResponse = z.infer<
  typeof publicBookingSlotsResponseSchema
>;
export type PublicBookingSlotsQuery = z.infer<typeof publicBookingSlotsQuerySchema>;
export type PublicBookingPhoneCheckRequest = z.infer<
  typeof publicBookingPhoneCheckRequestSchema
>;
export type PublicBookingPhoneCheckResponse = z.infer<
  typeof publicBookingPhoneCheckResponseSchema
>;
export type PublicBookingOtpRequest = z.infer<typeof publicBookingOtpRequestSchema>;
export type PublicBookingOtpVerify = z.infer<typeof publicBookingOtpVerifySchema>;
export type PublicBookingOtpVerifyResponse = z.infer<
  typeof publicBookingOtpVerifyResponseSchema
>;
export type PublicBookingContextResponse = z.infer<
  typeof publicBookingContextResponseSchema
>;
export type PublicBookingSubmitRequest = z.infer<
  typeof publicBookingSubmitRequestSchema
>;
export type PublicBookingSubmitResponse = z.infer<
  typeof publicBookingSubmitResponseSchema
>;
