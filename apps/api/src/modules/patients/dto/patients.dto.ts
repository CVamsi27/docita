import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { patientSchema } from '@workspace/types';

// Extend/Refine schema from workspace/types if needed, or use directly
export const CreatePatientSchema = patientSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export class CreatePatientDto extends createZodDto(CreatePatientSchema) {}

export const UpdatePatientSchema = patientSchema
  .partial()
  .omit({ id: true, createdAt: true, updatedAt: true });
export class UpdatePatientDto extends createZodDto(UpdatePatientSchema) {}

export class PatientResponseDto extends createZodDto(patientSchema) {}

const PaginatedPatientResponseSchema = z.object({
  items: z.array(patientSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
  count: z.number().optional(),
});
export class PaginatedPatientResponseDto extends createZodDto(
  PaginatedPatientResponseSchema,
) {}
