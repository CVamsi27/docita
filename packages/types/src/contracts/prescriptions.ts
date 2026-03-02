import { z } from "zod";
import {
  createPrescriptionSchema,
  prescriptionSchema,
} from "../clinical/medications";
import { stripHtmlTags } from "../api/sanitization";

export const prescriptionResponseSchema = prescriptionSchema;

export const createPrescriptionRequestSchema = createPrescriptionSchema.extend({
  notes: z.string().max(5000).transform(stripHtmlTags).optional(),
  instructions: z.string().max(5000).transform(stripHtmlTags).optional(),
  diagnosis: z.string().max(1000).transform(stripHtmlTags).optional(),
  doctorName: z.string().max(100).transform(stripHtmlTags).optional(),
  doctorEmail: z.string().email().max(255).transform(stripHtmlTags).optional(),
  doctorPhone: z.string().max(20).transform(stripHtmlTags).optional(),
  doctorSpecialization: z.string().max(100).transform(stripHtmlTags).optional(),
  doctorRole: z.string().max(50).transform(stripHtmlTags).optional(),
  doctorRegistrationNumber: z
    .string()
    .max(100)
    .transform(stripHtmlTags)
    .optional(),
  doctorLicenseNumber: z.string().max(100).transform(stripHtmlTags).optional(),
});

export const listPrescriptionsQuerySchema = z.object({
  search: z.string().optional(),
  date: z.string().optional(),
});

export type PrescriptionContractResponse = z.infer<typeof prescriptionResponseSchema>;
export type CreatePrescriptionRequest = z.infer<
  typeof createPrescriptionRequestSchema
>;
export type ListPrescriptionsContractQuery = z.infer<
  typeof listPrescriptionsQuerySchema
>;
