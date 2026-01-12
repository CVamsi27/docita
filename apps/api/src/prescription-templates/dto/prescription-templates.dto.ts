import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
export class CreatePrescriptionTemplateDto extends createZodDto(
  CreatePrescriptionTemplateSchema,
) {}

export class UpdatePrescriptionTemplateDto extends createZodDto(
  CreatePrescriptionTemplateSchema.partial(),
) {}
