import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { patientTagSchema } from '@workspace/types';

export const PatientTagResponseSchema = patientTagSchema;
export class PatientTagResponseDto extends createZodDto(
  PatientTagResponseSchema,
) {}

export const PatientTagListResponseSchema = z.array(patientTagSchema);
export class PatientTagListResponseDto extends createZodDto(
  PatientTagListResponseSchema,
) {}
