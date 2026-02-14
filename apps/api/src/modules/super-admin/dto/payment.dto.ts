// Payment processing types for super admin

import { ClinicTier } from '@workspace/db';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export interface ProcessPaymentDto {
  paymentId: string;
  amount: number;
  currency: string;
  newTier: ClinicTier;
  paymentMethod: string;
  notes?: string;
}

export const ExtendGracePeriodSchema = z.object({
  days: z.number().int().positive('Days must be a positive integer'),
});
export class ExtendGracePeriodRequestDto extends createZodDto(
  ExtendGracePeriodSchema,
) {}
