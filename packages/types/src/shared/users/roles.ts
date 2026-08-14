import { z } from "zod";

export const userRoleSchema = z.enum(["DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN", "INTERNAL", "ADMIN_DOCTOR", "PATIENT", "LAB"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const genderSchema = z.enum(["MALE", "FEMALE", "OTHER", "INTERSEX", "NON_BINARY", "PREFER_NOT_TO_SAY"]);
export type Gender = z.infer<typeof genderSchema>;

export const bloodGroupSchema = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
export type BloodGroup = z.infer<typeof bloodGroupSchema>;

export const appointmentStatusSchema = z.enum(["scheduled", "confirmed", "checked-in", "in-progress", "completed", "cancelled", "no-show"]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const VISIBLE_APPOINTMENT_STATUS_QUERY = "scheduled,confirmed,in-progress,completed,no-show" as const;

export const appointmentTypeSchema = z.enum(["consultation", "follow-up", "check-up", "emergency", "procedure", "other"]);
export type AppointmentType = z.infer<typeof appointmentTypeSchema>;

export const weekdaySchema = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
export type Weekday = z.infer<typeof weekdaySchema>;

export const invoiceStatusSchema = z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED", "PARTIALLY_PAID"]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const paymentStatusSchema = z.enum(["created", "pending", "paid", "failed", "expired", "cancelled"]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const customFieldTypeSchema = z.enum(["text", "number", "select", "date", "checkbox", "textarea"]);
export type CustomFieldType = z.infer<typeof customFieldTypeSchema>;

export const templateFieldTypeSchema = z.enum(["text", "number", "select", "checkbox", "textarea"]);
export type TemplateFieldType = z.infer<typeof templateFieldTypeSchema>;

export const whatsappMessageTypeSchema = z.enum(["reminder", "receipt", "payment-link", "general"]);
export type WhatsappMessageType = z.infer<typeof whatsappMessageTypeSchema>;

export const currencySchema = z.enum(["INR", "USD", "GBP", "EUR", "AUD", "CAD", "SGD", "AED", "ZAR"]);
export type Currency = z.infer<typeof currencySchema>;

export const facilityTypeSchema = z.enum(["CLINIC", "HOSPITAL"]);
export type FacilityTypeType = z.infer<typeof facilityTypeSchema>;
export enum FacilityType { CLINIC = "CLINIC", HOSPITAL = "HOSPITAL" }

export const clinicTypeSchema = z.enum(["GENERAL", "DENTAL", "PEDIATRIC", "ORTHOPEDIC", "CARDIOLOGY", "DERMATOLOGY", "ENT", "GYNECOLOGY", "OPHTHALMOLOGY", "PSYCHIATRY", "SPECIALTY"]);
export type ClinicType = z.infer<typeof clinicTypeSchema>;

export const specializationSchema = z.enum(["GENERAL_PRACTICE", "DENTAL", "CARDIOLOGY", "PEDIATRICS", "OPHTHALMOLOGY", "DERMATOLOGY", "ORTHOPEDICS", "NEUROLOGY", "GYNECOLOGY", "ENT", "PSYCHIATRY", "UROLOGY", "PULMONOLOGY", "GASTROENTEROLOGY", "ONCOLOGY", "NEPHROLOGY", "ENDOCRINOLOGY", "RHEUMATOLOGY", "RADIOLOGY", "PATHOLOGY", "ANESTHESIOLOGY", "EMERGENCY_MEDICINE", "FAMILY_MEDICINE", "INTERNAL_MEDICINE", "PLASTIC_SURGERY", "GENERAL_SURGERY", "OTHER"]);
export type Specialization = z.infer<typeof specializationSchema>;

export const hospitalRoleSchema = z.enum(["CONSULTANT", "SENIOR_CONSULTANT", "JUNIOR_DOCTOR", "RESIDENT", "INTERN", "VISITING_DOCTOR", "HEAD_OF_DEPARTMENT", "MEDICAL_DIRECTOR", "SURGEON", "CHIEF_SURGEON", "ATTENDING_PHYSICIAN", "FELLOW"]);
export type HospitalRole = z.infer<typeof hospitalRoleSchema>;

export const SUPPORTED_HOSPITAL_ROLES = [] as const satisfies readonly HospitalRole[];
export const supportedHospitalRoleSchema = z.never();

export const dayOfWeekSchema = z.enum(["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]);
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  SUNDAY: "Sunday", MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday",
};

export const DAY_OF_WEEK_INDEX: Record<DayOfWeek, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};
