import { ClinicTier } from '@workspace/db';
import { createZodDto } from 'nestjs-zod';
import {
  extendGracePeriodRequestSchema,
  recordInternalAdditionalChargeRequestSchema,
} from '@workspace/types';

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

export class RecordInternalAdditionalChargeRequestDto extends createZodDto(
  recordInternalAdditionalChargeRequestSchema,
) {}
