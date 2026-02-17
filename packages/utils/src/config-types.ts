import { z } from "zod";
import {
  appointmentStatusSchema,
  appointmentTypeSchema,
  bloodGroupSchema,
  currencySchema,
  customFieldTypeSchema,
  documentTypeSchema,
  genderSchema,
  invoiceStatusSchema,
  paymentStatusSchema,
  specializationSchema,
  templateFieldTypeSchema,
  weekdaySchema,
  whatsappMessageTypeSchema,
} from "@workspace/types";

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

export const genderValueSchema = genderSchema;
export type GenderValue = z.infer<typeof genderValueSchema>;

export const bloodGroupValueSchema = bloodGroupSchema;
export type BloodGroupValue = z.infer<typeof bloodGroupValueSchema>;

export const appointmentTypeValueSchema = appointmentTypeSchema;
export type AppointmentTypeValue = z.infer<typeof appointmentTypeValueSchema>;

export const appointmentStatusValueSchema = appointmentStatusSchema;
export type AppointmentStatusValue = z.infer<
  typeof appointmentStatusValueSchema
>;

export const invoiceStatusValueSchema = invoiceStatusSchema;
export type InvoiceStatusValue = z.infer<typeof invoiceStatusValueSchema>;

export const paymentStatusValueSchema = paymentStatusSchema;
export type PaymentStatusValue = z.infer<typeof paymentStatusValueSchema>;

export const userRoleValueSchema = z.enum([
  "DOCTOR",
  "RECEPTIONIST",
  "ADMIN",
  "ADMIN_DOCTOR",
  "SUPER_ADMIN",
]);
export type UserRoleValue = z.infer<typeof userRoleValueSchema>;

export const weekdayValueSchema = weekdaySchema;
export type WeekdayValue = z.infer<typeof weekdayValueSchema>;

export const customFieldTypeValueSchema = customFieldTypeSchema;
export type CustomFieldTypeValue = z.infer<typeof customFieldTypeValueSchema>;

export const templateFieldTypeValueSchema = templateFieldTypeSchema;
export type TemplateFieldTypeValue = z.infer<
  typeof templateFieldTypeValueSchema
>;

export const specialtyValueSchema = specializationSchema;
export type SpecialtyValue = z.infer<typeof specialtyValueSchema>;

export const documentTypeValueSchema = documentTypeSchema;
export type DocumentTypeValue = z.infer<typeof documentTypeValueSchema>;

export const facilityTypeValueSchema = z.enum(["CLINIC", "HOSPITAL"]);
export type FacilityTypeValue = z.infer<typeof facilityTypeValueSchema>;

export const whatsappMessageTypeValueSchema = whatsappMessageTypeSchema;
export type WhatsappMessageTypeValue = z.infer<
  typeof whatsappMessageTypeValueSchema
>;

export const currencyValueSchema = currencySchema;
export type CurrencyValue = z.infer<typeof currencyValueSchema>;

export const timezoneValueSchema = z.string();
