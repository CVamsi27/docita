// Payment processing types for super admin

import { ClinicTier } from '@workspace/db';

export interface ProcessPaymentDto {
  paymentId: string;
  amount: number;
  currency: string;
  newTier: ClinicTier;
  paymentMethod: string;
  notes?: string;
}
