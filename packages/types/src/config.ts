import { z } from "zod";

/**
 * =====================================================
 * APP CONFIGURATION - Single Source of Truth
 * =====================================================
 * All form options, enums, default values, and field definitions
 */

// =====================================================
// OPTION SCHEMAS
// =====================================================

export const selectOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});
export type SelectOption = z.infer<typeof selectOptionSchema>;

export const statusOptionSchema = selectOptionSchema.extend({
  color: z.string(),
});
export type StatusOption = z.infer<typeof statusOptionSchema>;

export const weekdayOptionSchema = selectOptionSchema.extend({
  short: z.string(),
});
export type WeekdayOption = z.infer<typeof weekdayOptionSchema>;

export const currencyOptionSchema = selectOptionSchema.extend({
  symbol: z.string(),
});
export type CurrencyOption = z.infer<typeof currencyOptionSchema>;

export const durationOptionSchema = z.object({
  value: z.number(),
  label: z.string(),
});
export type DurationOption = z.infer<typeof durationOptionSchema>;

// =====================================================
// GENDER OPTIONS
// =====================================================

export const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const genderValueSchema = z.enum(['MALE', 'FEMALE', 'OTHER']);
export type GenderValue = z.infer<typeof genderValueSchema>;

// =====================================================
// BLOOD GROUP OPTIONS
// =====================================================

export const BLOOD_GROUP_OPTIONS = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
] as const;

export const bloodGroupValueSchema = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
export type BloodGroupValue = z.infer<typeof bloodGroupValueSchema>;

// =====================================================
// APPOINTMENT OPTIONS
// =====================================================

export const APPOINTMENT_TYPE_OPTIONS = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'check-up', label: 'Check-up' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'procedure', label: 'Procedure' },
] as const;

export const appointmentTypeValueSchema = z.enum(['consultation', 'follow-up', 'check-up', 'emergency', 'procedure']);
export type AppointmentTypeValue = z.infer<typeof appointmentTypeValueSchema>;

export const APPOINTMENT_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled', color: 'purple' },
  { value: 'confirmed', label: 'Confirmed', color: 'blue' },
  { value: 'in-progress', label: 'In Progress', color: 'yellow' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
  { value: 'no-show', label: 'No Show', color: 'gray' },
] as const;

export const appointmentStatusValueSchema = z.enum(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']);
export type AppointmentStatusValue = z.infer<typeof appointmentStatusValueSchema>;

export const APPOINTMENT_DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
] as const;

// =====================================================
// INVOICE & PAYMENT OPTIONS
// =====================================================

export const INVOICE_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
] as const;

export const invoiceStatusValueSchema = z.enum(['pending', 'paid', 'overdue', 'cancelled']);
export type InvoiceStatusValue = z.infer<typeof invoiceStatusValueSchema>;

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'created', label: 'Created', color: 'blue' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'failed', label: 'Failed', color: 'red' },
  { value: 'expired', label: 'Expired', color: 'gray' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
] as const;

export const paymentStatusValueSchema = z.enum(['created', 'pending', 'paid', 'failed', 'expired', 'cancelled']);
export type PaymentStatusValue = z.infer<typeof paymentStatusValueSchema>;

// Note: PaymentMode and PaymentMethod enums are defined in payments.ts
// to support NestJS decorators (which require actual TypeScript enums)

// =====================================================
// USER ROLE OPTIONS
// =====================================================

export const USER_ROLE_OPTIONS = [
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'ADMIN_DOCTOR', label: 'Admin Doctor' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
] as const;

export const userRoleValueSchema = z.enum(['DOCTOR', 'RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR', 'SUPER_ADMIN']);
export type UserRoleValue = z.infer<typeof userRoleValueSchema>;

// =====================================================
// WEEKDAY OPTIONS
// =====================================================

export const WEEKDAY_OPTIONS = [
  { value: 'monday', label: 'Monday', short: 'Mon' },
  { value: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 'friday', label: 'Friday', short: 'Fri' },
  { value: 'saturday', label: 'Saturday', short: 'Sat' },
  { value: 'sunday', label: 'Sunday', short: 'Sun' },
] as const;

export const weekdayValueSchema = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
export type WeekdayValue = z.infer<typeof weekdayValueSchema>;

// =====================================================
// CUSTOM FIELD & TEMPLATE OPTIONS
// =====================================================

export const CUSTOM_FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select (Dropdown)' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'textarea', label: 'Text Area' },
] as const;

export const customFieldTypeValueSchema = z.enum(['text', 'number', 'select', 'date', 'checkbox', 'textarea']);
export type CustomFieldTypeValue = z.infer<typeof customFieldTypeValueSchema>;

export const TEMPLATE_FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
] as const;

export const templateFieldTypeValueSchema = z.enum(['text', 'number', 'select', 'checkbox', 'textarea']);
export type TemplateFieldTypeValue = z.infer<typeof templateFieldTypeValueSchema>;

// =====================================================
// SPECIALTY OPTIONS
// =====================================================

export const SPECIALTY_OPTIONS = [
  { value: 'General', label: 'General Practice' },
  { value: 'Dental', label: 'Dental' },
  { value: 'Cardiology', label: 'Cardiology' },
  { value: 'Pediatrics', label: 'Pediatrics' },
  { value: 'Ophthalmology', label: 'Ophthalmology' },
  { value: 'Dermatology', label: 'Dermatology' },
  { value: 'Orthopedics', label: 'Orthopedics' },
  { value: 'Neurology', label: 'Neurology' },
  { value: 'Gynecology', label: 'Gynecology' },
  { value: 'ENT', label: 'ENT (Ear, Nose, Throat)' },
  { value: 'Psychiatry', label: 'Psychiatry' },
  { value: 'Urology', label: 'Urology' },
  { value: 'Pulmonology', label: 'Pulmonology' },
  { value: 'Gastroenterology', label: 'Gastroenterology' },
  { value: 'Other', label: 'Other' },
] as const;

export const specialtyValueSchema = z.enum([
  'General', 'Dental', 'Cardiology', 'Pediatrics', 'Ophthalmology',
  'Dermatology', 'Orthopedics', 'Neurology', 'Gynecology', 'ENT',
  'Psychiatry', 'Urology', 'Pulmonology', 'Gastroenterology', 'Other'
]);
export type SpecialtyValue = z.infer<typeof specialtyValueSchema>;

// =====================================================
// DOCUMENT OPTIONS
// =====================================================

export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'scan', label: 'Scan/X-Ray' },
  { value: 'consent_form', label: 'Consent Form' },
  { value: 'insurance', label: 'Insurance Document' },
  { value: 'id_proof', label: 'ID Proof' },
  { value: 'other', label: 'Other' },
] as const;

export const documentTypeValueSchema = z.enum(['prescription', 'lab_report', 'scan', 'consent_form', 'insurance', 'id_proof', 'other']);
export type DocumentTypeValue = z.infer<typeof documentTypeValueSchema>;

// =====================================================
// WHATSAPP OPTIONS
// =====================================================

export const WHATSAPP_MESSAGE_TYPE_OPTIONS = [
  { value: 'reminder', label: 'Appointment Reminder' },
  { value: 'receipt', label: 'Payment Receipt' },
  { value: 'payment-link', label: 'Payment Link' },
  { value: 'general', label: 'General Message' },
] as const;

export const whatsappMessageTypeValueSchema = z.enum(['reminder', 'receipt', 'payment-link', 'general']);
export type WhatsappMessageTypeValue = z.infer<typeof whatsappMessageTypeValueSchema>;

// =====================================================
// CURRENCY & TIMEZONE OPTIONS
// =====================================================

export const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
] as const;

export const currencyValueSchema = z.enum(['INR', 'USD', 'EUR', 'GBP']);
export type CurrencyValue = z.infer<typeof currencyValueSchema>;

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
] as const;

export const timezoneValueSchema = z.enum([
  'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles'
]);
export type TimezoneValue = z.infer<typeof timezoneValueSchema>;

// =====================================================
// DEFAULT VALUES
// =====================================================

export const DEFAULT_APPOINTMENT_DURATION = 30;
export const DEFAULT_CONSULTATION_FEE = 800;
export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const DEFAULT_INVOICE_ITEMS = [
  { description: 'Consultation Fee', quantity: 1, price: 800 },
] as const;

// Note: PATIENT_IMPORT_FIELDS is defined in imports.ts with Zod schema support

// =====================================================
// APP CONFIG SCHEMA
// =====================================================

export const appConfigSchema = z.object({
  formOptions: z.object({
    gender: z.array(selectOptionSchema),
    bloodGroup: z.array(selectOptionSchema),
    appointmentType: z.array(selectOptionSchema),
    appointmentStatus: z.array(statusOptionSchema),
    invoiceStatus: z.array(statusOptionSchema),
    paymentStatus: z.array(statusOptionSchema),
    userRole: z.array(selectOptionSchema),
    weekday: z.array(weekdayOptionSchema),
    customFieldType: z.array(selectOptionSchema),
    templateFieldType: z.array(selectOptionSchema),
    specialty: z.array(selectOptionSchema),
    documentType: z.array(selectOptionSchema),
    appointmentDuration: z.array(durationOptionSchema),
    whatsappMessageType: z.array(selectOptionSchema),
    currency: z.array(currencyOptionSchema),
    timezone: z.array(selectOptionSchema),
  }),
  defaults: z.object({
    appointmentDuration: z.number(),
    consultationFee: z.number(),
    currency: z.string(),
    timezone: z.string(),
    invoiceItems: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      price: z.number(),
    })),
  }),
});
export type AppConfig = z.infer<typeof appConfigSchema>;

/**
 * Get complete form options configuration
 */
export function getFormOptions() {
  return {
    gender: GENDER_OPTIONS,
    bloodGroup: BLOOD_GROUP_OPTIONS,
    appointmentType: APPOINTMENT_TYPE_OPTIONS,
    appointmentStatus: APPOINTMENT_STATUS_OPTIONS,
    invoiceStatus: INVOICE_STATUS_OPTIONS,
    paymentStatus: PAYMENT_STATUS_OPTIONS,
    userRole: USER_ROLE_OPTIONS,
    weekday: WEEKDAY_OPTIONS,
    customFieldType: CUSTOM_FIELD_TYPE_OPTIONS,
    templateFieldType: TEMPLATE_FIELD_TYPE_OPTIONS,
    specialty: SPECIALTY_OPTIONS,
    documentType: DOCUMENT_TYPE_OPTIONS,
    appointmentDuration: APPOINTMENT_DURATION_OPTIONS,
    whatsappMessageType: WHATSAPP_MESSAGE_TYPE_OPTIONS,
    currency: CURRENCY_OPTIONS,
    timezone: TIMEZONE_OPTIONS,
  };
}

/**
 * Get default values
 */
export function getDefaults() {
  return {
    appointmentDuration: DEFAULT_APPOINTMENT_DURATION,
    consultationFee: DEFAULT_CONSULTATION_FEE,
    currency: DEFAULT_CURRENCY,
    timezone: DEFAULT_TIMEZONE,
    invoiceItems: DEFAULT_INVOICE_ITEMS,
  };
}
