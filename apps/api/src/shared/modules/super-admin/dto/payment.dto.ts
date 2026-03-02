import { ClinicTier } from '@workspace/db';
import { createZodDto } from 'nestjs-zod';
import { extendGracePeriodRequestSchema } from '@workspace/types';

export interface ProcessPaymentDto {
  paymentId: string;
  amount: number;
  currency: string;
  newTier: ClinicTier;
  paymentMethod: string;
  notes?: string;
}

export const ExtendGracePeriodSchema = extendGracePeriodRequestSchema;
export class ExtendGracePeriodRequestDto extends createZodDto(
  ExtendGracePeriodSchema,
) {}
