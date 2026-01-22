import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { prescriptionTemplateSchema } from '@workspace/types';

const MedicationDataSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
});

export const CreatePrescriptionTemplateSchema = z.object({
  name: z.string().min(1),
  medications: z.array(MedicationDataSchema),
  instructions: z.string().optional(),
});

export const PrescriptionTemplateSchema =
  CreatePrescriptionTemplateSchema.extend({
    id: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

export class CreatePrescriptionTemplateDto extends createZodDto(
  CreatePrescriptionTemplateSchema,
) {}

export class UpdatePrescriptionTemplateDto extends createZodDto(
  CreatePrescriptionTemplateSchema.partial(),
) {}

export class PrescriptionTemplateResponseDto extends createZodDto(
  prescriptionTemplateSchema,
) {}

export class PrescriptionTemplateListResponseDto extends createZodDto(
  z.array(prescriptionTemplateSchema),
) {}
