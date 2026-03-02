import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  createPrescriptionRequestSchema,
  listPrescriptionsQuerySchema,
  prescriptionResponseSchema,
} from '@workspace/types';

export const CreatePrescriptionSchema = createPrescriptionRequestSchema;

export class CreatePrescriptionDto extends createZodDto(
  CreatePrescriptionSchema,
) {}

export const ListPrescriptionsQuerySchema = listPrescriptionsQuerySchema;
export class ListPrescriptionsQueryDto extends createZodDto(
  ListPrescriptionsQuerySchema,
) {}

export class PrescriptionResponseDto extends createZodDto(
  prescriptionResponseSchema,
) {}

export class PrescriptionListResponseDto extends createZodDto(
  z.array(prescriptionResponseSchema),
) {}
