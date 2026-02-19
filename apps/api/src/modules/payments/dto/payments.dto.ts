import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  createPaymentLinkSchema,
  paymentLinkResponseSchema,
  paymentSessionSchema,
} from '@workspace/types';

export class CreatePaymentLinkDto extends createZodDto(
  createPaymentLinkSchema,
) {}
export class PaymentLinkResponseDto extends createZodDto(
  paymentLinkResponseSchema,
) {}
export class PaymentSessionResponseDto extends createZodDto(
  paymentSessionSchema,
) {}

export const MarkInvoicePaidSchema = z.object({
  paymentMethod: z.enum(['CASH', 'OTHER']).default('CASH'),
  amount: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

export class MarkInvoicePaidDto extends createZodDto(MarkInvoicePaidSchema) {}

export class AnyResponseDto extends createZodDto(z.any()) {}
