import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  createPrescriptionSchema,
  prescriptionSchema,
  stripHtmlTags,
} from '@workspace/types';

// Create hardened schema with proper length limits and HTML sanitization on doctor context
export const CreatePrescriptionSchema = createPrescriptionSchema.extend({
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

export class CreatePrescriptionDto extends createZodDto(
  CreatePrescriptionSchema,
) {}

export class PrescriptionResponseDto extends createZodDto(prescriptionSchema) {}

export class PrescriptionListResponseDto extends createZodDto(
  z.array(prescriptionSchema),
) {}
